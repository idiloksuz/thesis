export default class CustomPalette {
  constructor(bpmnFactory, create, elementFactory, palette, translate) {
    this.bpmnFactory = bpmnFactory;
    this.create = create;
    this.elementFactory = elementFactory;
    this.translate = translate;

    palette.registerProvider(this);
  }

  getPaletteEntries(element) {
    const {
      bpmnFactory,
      create,
      elementFactory,
      translate
    } = this;

    // Define any other palette entries you need, without KEI tasks
    const entries = {
      'create.start-event': {
        group: 'event',
        className: 'bpmn-icon-start-event-none',
        title: translate('Create StartEvent'),
        action: {
          dragstart: function(event) {
            const shape = elementFactory.createShape({
              type: 'bpmn:StartEvent'
            });

            create.start(event, shape);
          },
          click: function(event) {
            const shape = elementFactory.createShape({
              type: 'bpmn:StartEvent'
            });

            create.start(event, shape);
          }
        }
      },
      'create.end-event': {
        group: 'event',
        className: 'bpmn-icon-end-event-none',
        title: translate('Create EndEvent'),
        action: {
          dragstart: function(event) {
            const shape = elementFactory.createShape({
              type: 'bpmn:EndEvent'
            });

            create.start(event, shape);
          },
          click: function(event) {
            const shape = elementFactory.createShape({
              type: 'bpmn:EndEvent'
            });

            create.start(event, shape);
          }
        }
      },
      // Add other palette entries as needed
    };

    return entries;
  }
}

CustomPalette.$inject = [
  'bpmnFactory',
  'create',
  'elementFactory',
  'palette',
  'translate'
];
