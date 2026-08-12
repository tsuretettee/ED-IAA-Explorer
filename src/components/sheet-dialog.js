export const SheetDialog = {
  name: 'SheetDialog',
  props: {
    open: { type: Boolean, default: false },
    label: { type: String, default: '' },
    accent: { type: Boolean, default: false },
  },
  emits: ['close'],
  watch: {
    open(value) {
      const dialog = this.$refs.dialog
      if (value && !dialog.open) dialog.showModal()
      else if (!value && dialog.open) dialog.close()
    },
  },
  methods: {
    onClick(event) {
      if (event.target === this.$refs.dialog) this.$refs.dialog.close()
    },
  },
  template: `
    <dialog ref="dialog" :aria-label="label" @close="$emit('close')" @click="onClick">
      <div class="sheet" :class="{ accent }">
        <button class="close" aria-label="Close" @click="$refs.dialog.close()">&times;</button>
        <slot></slot>
      </div>
    </dialog>
  `,
}
