/* eslint-disable import/no-extraneous-dependencies */
import { css, html, LitElement } from 'lit';
import { property, query, state } from 'lit/decorators.js';

import '@material/web/button/text-button';
import '@material/web/dialog/dialog';
import { Dialog } from '@material/web/dialog/internal/dialog';

import '@openenergytools/filterable-lists/dist/selection-list.js';
import type {
  SelectionList,
  SelectItem,
} from '@openenergytools/filterable-lists/dist/selection-list.js';

import { newEditEvent } from '@openscd/open-scd-core';
import { removeIED } from '@openenergytools/scl-lib';

function getIedDescription(ied: Element): {
  firstLine: string;
  secondLine: string;
} {
  const [
    manufacturer,
    type,
    desc,
    configVersion,
    originalSclVersion,
    originalSclRevision,
    originalSclRelease,
  ] = [
    'manufacturer',
    'type',
    'desc',
    'configVersion',
    'originalSclVersion',
    'originalSclRevision',
    'originalSclRelease',
  ].map(attr => ied?.getAttribute(attr));

  const firstLine = [manufacturer, type]
    .filter(val => val !== null)
    .join(' - ');

  const schemaInformation = [
    originalSclVersion,
    originalSclRevision,
    originalSclRelease,
  ]
    .filter(val => val !== null)
    .join('');

  const secondLine = [desc, configVersion, schemaInformation]
    .filter(val => val !== null)
    .join(' - ');

  return { firstLine, secondLine };
}

/** An editor [[`plugin`]] to import IEDs from SCL files */
export default class RemoveIEDsPlugin extends LitElement {
  /** The document being edited as provided to plugins by [[`OpenSCD`]]. */
  @property({ attribute: false })
  doc!: XMLDocument;

  /** SCL change indicator */
  @property({ type: Number })
  editCount = -1;

  @state()
  items: SelectItem[] = [];

  @query('input') input!: HTMLInputElement;

  @query('#selection-dialog') dialogUI!: Dialog;

  @query('#selection-list') selectionList!: SelectionList;

  async run() {
    this.items = Array.from(this.doc.querySelectorAll('IED')).map(ied => {
      const { firstLine, secondLine } = getIedDescription(ied);

      return {
        headline: `${ied.getAttribute('name')!} — ${firstLine}`,
        supportingText: secondLine,
        attachedElement: ied,
        selected: false,
      };
    });

    this.dialogUI.show();
  }

  async removeIEDs(): Promise<void> {
    const ieds = this.selectionList.selectedElements;

    for await (const ied of ieds) {
      this.dispatchEvent(newEditEvent(removeIED({ node: ied })));

      // TODO: Fixme -- ugly timeout that might resolve with newer versions of OpenSCD core
      // await setTimeout(() => {}, 100);
    }
  }

  render() {
    return html`<md-dialog
      id="selection-dialog"
      @cancel=${(event: Event) => event.preventDefault()}
    >
      <form slot="content" id="selection" method="dialog">
        <selection-list
          id="selection-list"
          .items=${this.items}
          filterable
        ></selection-list>
      </form>
      <div slot="actions">
        <md-text-button @click=${() => this.dialogUI.close()}
          >Close</md-text-button
        >
        <md-text-button
          @click="${() => {
            this.removeIEDs();
          }}"
          form="selection"
          >Remove IEDs</md-text-button
        >
      </div></md-dialog
    >`;
  }

  static styles = css`
    input {
      width: 0;
      height: 0;
      opacity: 0;
    }

    form {
      padding: 10px;
    }
  `;
}
