import { SheetDialog } from './sheet-dialog.js'

export const ClauseDialog = {
  name: 'ClauseDialog',
  components: { SheetDialog },
  props: {
    selection: { type: Object, default: null },
  },
  emits: ['close'],
  computed: {
    label() {
      return this.selection ? `${this.selection.name} — ${this.selection.column}` : ''
    },
  },
  template: `
    <sheet-dialog :open="!!selection" :label="label" @close="$emit('close')">
      <template v-if="selection">
        <h3>{{ selection.name }}</h3>
        <p class="crumb">{{ selection.column }}</p>
        <blockquote class="q" v-for="(quote, i) in selection.cell.quotes" :key="i">
          <p class="party">{{ quote.party }}</p>
          <p>{{ quote.text }}</p>
        </blockquote>
        <div class="src" v-if="selection.cell.url">
          <span class="cap">Source</span>
          <a :href="selection.cell.url" target="_blank" rel="noopener">{{ selection.cell.url }}</a>
        </div>
      </template>
    </sheet-dialog>
  `,
}
