export const PartnershipCard = {
  name: 'PartnershipCard',
  props: {
    row: { type: Object, required: true },
    columns: { type: Array, required: true },
  },
  emits: ['open'],
  methods: {
    cell(column) {
      return this.row.cells[column]
    },
    addressed(column) {
      return this.cell(column).holders.length > 0
    },
    shared(column) {
      return this.cell(column).holders.length > 1
    },
    who(column) {
      return this.addressed(column) ? this.cell(column).value : 'not addressed'
    },
    chipClass(holder) {
      return 'chip--' + holder.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    },
    label(column) {
      const suffix = this.addressed(column) ? ', view clause' : ''
      return `${column} — ${this.who(column)}${suffix}`
    },
  },
  template: `
    <section class="card">
      <h2>{{ row.name }}</h2>
      <ul class="fns">
        <li v-for="column in columns" :key="column">
          <button
            class="fn"
            :class="{ shared: shared(column) }"
            :disabled="!addressed(column)"
            :aria-label="label(column)"
            @click="$emit('open', { row, column })"
          >
            <span class="nm">{{ column }}</span>
            <span class="who">
              <span v-if="addressed(column)" class="chips" :class="{ split: shared(column) }">
                <span
                  v-for="holder in cell(column).holders"
                  :key="holder"
                  class="chip"
                  :class="chipClass(holder)"
                >{{ holder }}</span>
              </span>
              <span v-else class="none-label">not addressed</span>
            </span>
          </button>
        </li>
      </ul>
    </section>
  `,
}
