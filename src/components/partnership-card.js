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
            :disabled="!addressed(column)"
            :aria-label="label(column)"
            @click="$emit('open', { row, column })"
          >
            <span class="bar" aria-hidden="true">
              <b v-if="!addressed(column)" class="none"></b>
              <template v-else>
                <b class="a"></b>
                <b v-if="shared(column)" class="b"></b>
              </template>
            </span>
            <span class="nm">{{ column }}</span>
            <span class="who">{{ who(column) }}</span>
          </button>
        </li>
      </ul>
    </section>
  `,
}
