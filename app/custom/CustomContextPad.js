import { assign } from 'min-dash';
import { is } from 'bpmn-js/lib/util/ModelUtil';

const HIGH_PRIORITY = 1500;
const KEIS = [
  "Total energy",
  "Renewable energy",
  "Non-Renewable energy",
  "Indoor energy",
  "Transportation energy",
  "Total waste",
  "Recyclable waste",
  "Non-Recyclable waste",
  "Hazardous waste",
  "Total water withdrawal",
  "Water Non-consumptive use",
  "Water Use",
  "Water Pollution",
  "Total emissions to air",
  "GHGs emissions",
  "CO2 emissions",
  "NOx and SOx emissions"
];

export default class CustomContextPad {
  constructor(bpmnFactory, config, contextPad, create, elementFactory, injector, translate, eventBus) {
    this.bpmnFactory = bpmnFactory;
    this.create = create;
    this.elementFactory = elementFactory;
    this.translate = translate;
    this.eventBus = eventBus;
    this.bpmnModeler = null; // Initialize with null

    if (config.autoPlace !== false) {
      this.autoPlace = injector.get('autoPlace', false);
    }

    contextPad.registerProvider(this);
  }

  setBpmnModeler(bpmnModeler) {
    this.bpmnModeler = bpmnModeler;
  }

  getContextPadEntries(element) {
    const {
      autoPlace,
      bpmnFactory,
      create,
      elementFactory,
      translate,
      eventBus,
      bpmnModeler
    } = this;

    const actions = {};

    function appendTaskWithKEI(kei) {
      return function(event) {
        const businessObject = bpmnFactory.create('bpmn:Task');
        businessObject.kei = kei;

        const shape = elementFactory.createShape({
          type: 'bpmn:Task',
          businessObject: businessObject
        });

        if (autoPlace) {
          autoPlace.append(element, shape);
        } else {
          create.start(event, shape, element);
        }
      };
    }

    function editTaskKEI(event, element) {
      console.log("Edit KEI clicked", event);
      const businessObject = element.businessObject;
      const menu = document.createElement('div');
      menu.className = 'custom-kei-menu';

      KEIS.forEach(kei => {
        const menuItem = document.createElement('div');
        menuItem.className = 'custom-kei-menu-item';
        menuItem.innerText = kei;
        menuItem.addEventListener('click', () => {
          console.log("KEI selected:", kei);
          businessObject.kei = kei;

          // Ensure the KEI is serialized in the XML
          const moddle = bpmnModeler.get('moddle');
          const extensionElements = businessObject.extensionElements || moddle.create('bpmn:ExtensionElements');
          businessObject.extensionElements = extensionElements;

          const keiElement = moddle.create('qa:Kei', { value: kei });
          if (!extensionElements.get('values').includes(keiElement)) {
            extensionElements.get('values').push(keiElement);
          }

          eventBus.fire('element.changed', { element });
          document.body.removeChild(menu);
        });
        menu.appendChild(menuItem);
      });

      console.log('Appending menu to body:', menu);
      document.body.appendChild(menu);

      const { clientX, clientY } = event.originalEvent || event;
      menu.style.position = 'absolute';
      menu.style.left = `${clientX}px`;
      menu.style.top = `${clientY}px`;

      console.log('Menu positioned at:', menu.style.cssText);

      setTimeout(() => {
        document.addEventListener('click', (e) => {
          if (!menu.contains(e.target)) {
            if (menu.parentElement) {
              document.body.removeChild(menu);
            }
          }
        }, { once: true });
      }, 100);
    }

    actions['append.kei-task'] = {
      group: 'model',
      className: 'bpmn-icon-task',
      title: translate('Append Task with KEI'),
      action: {
        click: appendTaskWithKEI('Specify KEI'),
        dragstart: appendTaskWithKEI('Specify KEI')
      }
    };

    actions['edit.kei-task'] = {
      group: 'edit',
      className: 'bpmn-icon-screw-wrench',
      title: translate('Edit KEI'),
      action: {
        click: (event, element) => {
          console.log("edit.kei-task action triggered");
          editTaskKEI(event, element);
        }
      }
    };

    return actions;
  }
}

CustomContextPad.$inject = [
  'bpmnFactory',
  'config',
  'contextPad',
  'create',
  'elementFactory',
  'injector',
  'translate',
  'eventBus'
];
