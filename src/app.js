import { PartnershipCard } from './components/partnership-card.js'
import { ClauseDialog } from './components/clause-dialog.js'
import { SheetDialog } from './components/sheet-dialog.js'
import { buildChart, ChartError } from './lib/chart.js'

const CSV_FILES = {
  chart: './data/ED_IAA_chart_data - CHART.csv',
  justification: './data/ED_IAA_chart_data - JUSTIFICATION.csv',
}

let lastTrigger = null

const ABOUT_SEEN = 'iaa-about-seen'

const App = {
  components: { PartnershipCard, ClauseDialog, SheetDialog },
  data() {
    return {
      columns: [],
      rows: [],
      selection: null,
      aboutOpen: false,
      error: '',
    }
  },
  created() {
    this.load()
  },
  mounted() {
    let seen = false
    try {
      seen = window.localStorage.getItem(ABOUT_SEEN) === '1'
    } catch (err) {
      seen = false
    }
    if (!seen) {
      this.aboutOpen = true
      this.markAboutSeen()
    }
  },
  methods: {
    markAboutSeen() {
      try {
        window.localStorage.setItem(ABOUT_SEEN, '1')
      } catch (err) {
        void err
      }
    },
    closeAbout() {
      this.aboutOpen = false
      this.markAboutSeen()
    },
    async load() {
      try {
        const sources = window.__IAA_CSV__ || (await this.fetchSources())
        const data = buildChart(sources.chart, sources.justification)
        this.columns = data.columns
        this.rows = data.rows
      } catch (err) {
        this.error =
          err instanceof ChartError
            ? `The spreadsheet exports in data/ don't line up — ${err.message}`
            : `Could not read the spreadsheet exports from data/ (${err.message}). ` +
              `Serve this page over http rather than opening it from disk ` +
              `— or use the built dist/iaa-explorer.html.`
      }
    },
    async fetchSources() {
      const read = async (path) => {
        const response = await fetch(encodeURI(path))
        if (!response.ok) throw new Error(`${path}: ${response.status} ${response.statusText}`)
        return response.text()
      }
      const [chart, justification] = await Promise.all([
        read(CSV_FILES.chart),
        read(CSV_FILES.justification),
      ])
      return { chart, justification }
    },
    open({ row, column }) {
      lastTrigger = document.activeElement
      this.selection = { name: row.name, column, cell: row.cells[column] }
    },
    close() {
      this.selection = null
      if (lastTrigger) {
        lastTrigger.focus()
        lastTrigger = null
      }
    },
  },
  template: `
    <div class="wrap">
      <h1>Department of Education interagency agreement explorer</h1>

      <p v-if="error" class="status bad">{{ error }}</p>
      <p v-else-if="!rows.length" class="status">Loading…</p>

      <template v-else>
        <div class="key">
          <span><i style="background:var(--solid)"></i>Held by one party</span>
          <span><i class="split"></i>Held by two agencies</span>
          <span><i style="background:var(--none)"></i>Not addressed</span>
        </div>

        <div class="cards">
          <partnership-card
            v-for="row in rows"
            :key="row.name"
            :row="row"
            :columns="columns"
            @open="open"
          />
        </div>
      </template>
    </div>

    <clause-dialog :selection="selection" @close="close" />

    <sheet-dialog :open="aboutOpen" label="About" accent @close="closeAbout">
      <div class="about">
        <p class="kicker">Interagency Agreement Tracker</p>
        <h3>About</h3>
        <p class="lead">
          Welcome to the Department of Education interagency agreement explorer! This tool is
          designed to provide the public with a nuanced view of how ED will be attempting to
          shift responsibilities to different departments as part of a larger effort to
          dismantle the education agency.
        </p>
        <p>
          Despite the movement to dissolve the Department of Education, its closure can never
          be fully completed without an act of congress. This means that while certain
          interagency agreements are in effect, some statutory responsibilities remain in
          house, while other roles are outsourced to places like the Department of Labor, or
          Health and Human Services.
        </p>
        <p>
          This transition has created confusion among education agencies and activist groups,
          as programs that once took place solely under the Department of Education, now take
          place under multiple agencies. This means for example that ED must keep a legally
          required special education office open under IDEA, while moving roles like grant
          administration to HHS.
        </p>
        <p>
          To properly represent this, instead of treating interagency agreements as full
          transitions of responsibility, this tool divides the effect of an Interagency
          agreement into 6 categories:
        </p>
        <dl class="terms">
          <div><dt>Statutory authority</dt><dd>Who holds the legal responsibility?</dd></div>
          <div><dt>Policy clearance</dt><dd>Who signs off on guidance and Federal Register notices?</dd></div>
          <div><dt>Grant administration</dt><dd>Who awards grants?</dd></div>
          <div><dt>Payments</dt><dd>Where does the money come from?</dd></div>
          <div><dt>Enforcement</dt><dd>Who manages statutory compliance?</dd></div>
          <div><dt>Outreach</dt><dd>Who does the public communicate with?</dd></div>
        </dl>
        <p class="portal">
          The listed scopes of the interagency agreements are derived from ED’s Returning
          Education to the States portal available at:
          <a href="https://www.ed.gov/about/initiatives/returning-education-states" target="_blank" rel="noopener">https://www.ed.gov/about/initiatives/returning-education-states</a>
        </p>
        <p>
          Clicking on a populated cell on the chart gives you an excerpt of the relevant IAA,
          assigning responsibility to a specific agency. If a cell is marked as NOT ADDRESSED
          a given responsibility is not directly mentioned or assigned within an agreement.
        </p>
        <p>
          This tool was created by Caen Jones and licensed under Creative Commons Zero v1.0 Universal.
      </div>
    </sheet-dialog>

    <div class="corner">
      <button type="button" title="About" aria-label="About" @click="aboutOpen = true">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 16.2a1.2 1.2 0 110-2.4 1.2 1.2 0 010 2.4zm1.6-5.5c-.6.4-.8.7-.8 1.3v.4h-1.7v-.5c0-1.2.4-1.8 1.3-2.4.7-.5 1-.8 1-1.4 0-.7-.5-1.1-1.3-1.1-.7 0-1.3.4-1.5 1.2l-1.6-.5c.3-1.4 1.5-2.3 3.1-2.3 1.9 0 3.1 1 3.1 2.6 0 1.2-.6 1.8-1.6 2.7z"/></svg>
      </button>
    </div>
  `,
}

Vue.createApp(App).mount('#app')
