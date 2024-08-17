import { assign } from 'min-dash';
import { is } from 'bpmn-js/lib/util/ModelUtil';

const KEI_CATEGORIES = {
  Energy: [
    "energyConsumption",
    "renewableEnergy",
    "nonRenewableEnergy",
    "indoorEnergy",
    "transportationEnergy",
    "[singleSourceOfEnergy]"
  ],
  Waste: ["wasteGeneration"],
  Water: ["waterUsage"],
  Emissions: ["carbondioxideEmissions"]
};

export default class CustomContextPad {
  constructor(bpmnFactory, config, contextPad, create, elementFactory, injector, translate, eventBus, modeling, elementRegistry, popupMenu) {
    this.bpmnFactory = bpmnFactory;
    this.create = create;
    this.elementFactory = elementFactory;
    this.translate = translate;
    this.eventBus = eventBus;
    this.modeling = modeling;
    this.elementRegistry = elementRegistry;
    this.popupMenu = popupMenu;
    this.bpmnModeler = null; // Initialize with null

    if (config.autoPlace !== false) {
      this.autoPlace = injector.get('autoPlace', false);
    }

    contextPad.registerProvider(this);

    eventBus.on('commandStack.shape.replace.postExecute', (event) => {
      const { context } = event;
      const { newShape } = context;

      // Reapply KEI properties after the shape is replaced
      const keiProperties = this.extractKEIProperties(context.oldShape.businessObject);
      assign(newShape.businessObject, keiProperties);

      // Ensure KEI extension elements are correctly handled
      this.ensureKEIExtensionElements(newShape.businessObject, keiProperties);

      // Trigger re-rendering of the KEI properties
    });
  }

  extractKEIProperties(businessObject) {
    return {
      kei: businessObject.kei || 'defaultKEI',
      energyConsumption: businessObject.energyConsumption || undefined,
      renewableEnergy: businessObject.renewableEnergy || undefined,
      nonRenewableEnergy: businessObject.nonRenewableEnergy || undefined,
      indoorEnergy: businessObject.indoorEnergy || undefined,
      transportationEnergy: businessObject.transportationEnergy || undefined,
      singleSourceOfEnergy: businessObject.singleSourceOfEnergy || undefined,
      carbonDioxideEmissions: businessObject.carbonDioxideEmissions || undefined,
      waterUsage: businessObject.waterUsage || undefined,
      wasteGeneration: businessObject.wasteGeneration || undefined,
      monitored: businessObject.monitored || false
    };
  }

  setBpmnModeler(bpmnModeler) {
    this.bpmnModeler = bpmnModeler;
  }

  preserveKEIProperties(oldShape, newShape) {
    const oldBusinessObject = oldShape.businessObject;
    const newBusinessObject = newShape.businessObject;

    const keiProperties = {
      kei: oldBusinessObject.kei,
      energyConsumption: oldBusinessObject.energyConsumption,
      renewableEnergy: oldBusinessObject.renewableEnergy,
      nonRenewableEnergy: oldBusinessObject.nonRenewableEnergy,
      indoorEnergy: oldBusinessObject.indoorEnergy,
      transportationEnergy: oldBusinessObject.transportationEnergy,
      singleSourceOfEnergy: oldBusinessObject.singleSourceOfEnergy,
      carbonDioxideEmissions: oldBusinessObject.carbonDioxideEmissions,
      waterUsage: oldBusinessObject.waterUsage,
      wasteGeneration: oldBusinessObject.wasteGeneration,
      monitored: oldBusinessObject.monitored
    };

    assign(newBusinessObject, keiProperties);
    this.ensureKEIExtensionElements(newBusinessObject, keiProperties);
    this.modeling.updateProperties(newShape, { businessObject: newBusinessObject });
    this.eventBus.fire('element.changed', { element: newShape });

    console.log('Preserved KEI properties:', keiProperties);
  }

  ensureKEIExtensionElements(businessObject, keiProperties) {
    const moddle = this.bpmnModeler.get('moddle');
    let extensionElements = businessObject.extensionElements;

    if (!extensionElements) {
        extensionElements = moddle.create('bpmn:ExtensionElements');
        businessObject.extensionElements = extensionElements;
    }

    if (!extensionElements.values) {
        extensionElements.values = [];
    }

    extensionElements.values = extensionElements.values.filter(el => el.$type === 'sm:Kei' || !el.$type.startsWith('sm:'));

    let keiElement = extensionElements.get('values').find(el => el.$type === 'sm:Kei');
    if (!keiElement) {
        keiElement = moddle.create('sm:Kei', { value: keiProperties.kei });
        extensionElements.get('values').push(keiElement);
        console.log('Created KEI element:', keiElement);
    } else {
        keiElement.value = keiProperties.kei;
    }

    if (keiProperties.monitored) {
        keiElement.monitored = 'true';
    } else {
        delete keiElement.monitored;
    }

    // Ensure values are stored even if only measured
    this.handleKEIElement('energyConsumption', 'sm:energyConsumption', businessObject, 'energyConsumption', 'kWh', keiProperties.monitored, keiProperties.energyConsumption, moddle, extensionElements);
    this.handleKEIElement('renewableEnergy', 'sm:renewableEnergy', businessObject, 'renewableEnergy', 'kWh', keiProperties.monitored, keiProperties.renewableEnergy, moddle, extensionElements);
    this.handleKEIElement('nonRenewableEnergy', 'sm:nonRenewableEnergy', businessObject, 'nonRenewableEnergy', 'kWh', keiProperties.monitored, keiProperties.nonRenewableEnergy, moddle, extensionElements);
    this.handleKEIElement('indoorEnergy', 'sm:indoorEnergy', businessObject, 'indoorEnergy', 'kWh', keiProperties.monitored, keiProperties.indoorEnergy, moddle, extensionElements);
    this.handleKEIElement('transportationEnergy', 'sm:transportationEnergy', businessObject, 'transportationEnergy', 'kWh', keiProperties.monitored, keiProperties.transportationEnergy, moddle, extensionElements);
    this.handleKEIElement('[singleSourceOfEnergy]', 'sm:singleSourceOfEnergy', businessObject, 'singleSourceOfEnergy', 'kWh', keiProperties.monitored, keiProperties.singleSourceOfEnergy, moddle, extensionElements);
    this.handleKEIElement('carbonDioxideEmissions', 'sm:carbonDioxideEmissions', businessObject, 'carbonDioxideEmissions', 'kg', keiProperties.monitored, keiProperties.carbonDioxideEmissions, moddle, extensionElements);
    this.handleKEIElement('waterUsage', 'sm:waterUsage', businessObject, 'waterUsage', 'liters', keiProperties.monitored, keiProperties.waterUsage, moddle, extensionElements);
    this.handleKEIElement('wasteGeneration', 'sm:wasteGeneration', businessObject, 'wasteGeneration', 'kg', keiProperties.monitored, keiProperties.wasteGeneration, moddle, extensionElements);
}

  handleKEIElement(keiType, elementType, businessObject, property, unit, monitored, measuredValue, moddle, extensionElements) {
    if (businessObject.kei === keiType) {
      let keiElement = extensionElements.get('values').find(el => el.$type === elementType);

      if (!keiElement) {
        // Create the KEI element if it doesn't exist
        keiElement = moddle.create(elementType, {});
        extensionElements.get('values').push(keiElement);
      }

      // Update the value, and ensure it's always handled, even if it was empty before
      if (measuredValue !== undefined && measuredValue !== null) {
        keiElement.value = measuredValue.toString();  // Ensure the value is always a string
      } 
      // Set or update the unit and monitored attributes
      if (unit) {
        keiElement.unit = unit;
      } else {
        delete keiElement.unit;
      }

      if (monitored) {
        keiElement.monitored = 'true';
      } else {
        delete keiElement.monitored;
      }
    }
  }


  getContextPadEntries(element) {
    const { autoPlace, bpmnFactory, create, elementFactory, translate, eventBus, bpmnModeler, modeling, elementRegistry, popupMenu } = this;

    const actions = {};
    const editTaskKEI = (event, element) => {
      const businessObject = element.businessObject;
      const menu = document.createElement('div');
      menu.className = 'custom-kei-menu';

      Object.keys(KEI_CATEGORIES).forEach(category => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'custom-kei-menu-category';
        categoryItem.innerText = category;

        const subMenu = document.createElement('div');
        subMenu.className = 'custom-kei-submenu';

        KEI_CATEGORIES[category].forEach(kei => {
          const menuItem = document.createElement('div');
          menuItem.className = 'custom-kei-menu-item';
          menuItem.innerText = kei;
          menuItem.addEventListener('click', () => {
            const measured = confirm('Is the task measured?');
            const monitored = confirm('Is the task monitored?');
            let keiElementValue = undefined;


            businessObject.kei = kei;
            businessObject.measured = measured;
            businessObject.monitored = monitored;

            if (measured) {
              let input = prompt(`Enter the ${kei} value (e.g., kWh):`);
              if (input !== null && input !== '') {
                  keiElementValue = input;
                  businessObject[kei] = keiElementValue; // Store the value in the businessObject
              }
          }
            this.ensureKEIExtensionElements(businessObject, { kei, monitored, [kei]: keiElementValue });
            eventBus.fire('element.changed', { element });
            document.body.removeChild(menu);
          });
          subMenu.appendChild(menuItem);
        });

        categoryItem.appendChild(subMenu);
        menu.appendChild(categoryItem);
      });

      document.body.appendChild(menu);
      const { clientX, clientY } = event.originalEvent || event;
      menu.style.position = 'absolute';
      menu.style.left = `${clientX}px`;
      menu.style.top = `${clientY}px`;

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

    actions['edit.kei-task'] = {
      group: 'edit',
      className: 'bpmn-icon-custom-kei',  // Use your custom icon class here
      title: translate('Edit KEI'),
      action: {
        click: (event, element) => {
          editTaskKEI(event, element);
        }
      }
    };

    actions['replace'] = {
      group: 'edit',
      className: 'bpmn-icon-screw-wrench',
      title: translate('Change element'),
      action: {
        click: (event, element) => {
          const businessObject = element.businessObject;

          // Preserve KEI properties before replacement
          const keiProperties = {
            kei: businessObject.kei,
            energyConsumption: businessObject.energyConsumption,
            renewableEnergy: businessObject.renewableEnergy,
            nonRenewableEnergy: businessObject.nonRenewableEnergy,
            indoorEnergy: businessObject.indoorEnergy,
            transportationEnergy: businessObject.transportationEnergy,
            singleSourceOfEnergy: businessObject.singleSourceOfEnergy,
            carbonDioxideEmissions: businessObject.carbonDioxideEmissions,
            waterUsage: businessObject.waterUsage,
            wasteGeneration: businessObject.wasteGeneration,
            monitored: businessObject.monitored
          };

          const position = assign(getReplaceMenuPosition(element), {
            cursor: { x: event.x, y: event.y }
          });

          popupMenu.open(element, 'bpmn-replace', position, {
            title: translate('Change element'),
            width: 300,
            search: true
          });

          const onReplace = ({ context }) => {
            const { newShape } = context;
            const newBusinessObject = newShape.businessObject;
            assign(newBusinessObject, keiProperties);
            this.ensureKEIExtensionElements(newBusinessObject, keiProperties);
            this.modeling.updateProperties(newShape, { businessObject: newBusinessObject });
            this.eventBus.off('replace', onReplace); // Unsubscribe after handling
          };
          this.eventBus.on('replace', onReplace);
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
  'eventBus',
  'modeling',
  'elementRegistry',
  'popupMenu'
];

function getReplaceMenuPosition(element) {
  const Y_OFFSET = 5;
  const bbox = element.businessObject.di.bounds;
  return {
    x: bbox.x + bbox.width / 2,
    y: bbox.y + bbox.height + Y_OFFSET
  };
}

// CSS for the custom KEI menu
const style = document.createElement('style');
style.innerHTML = `
  .custom-kei-menu {
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    padding: 8px;
    width: 200px;
    z-index: 1000;
  }
  .custom-kei-menu-category {
    padding: 8px;
    cursor: pointer;
    border-bottom: 1px solid #eee;
  }
  .custom-kei-menu-category:last-child {
    border-bottom: none;
  }
  .custom-kei-submenu {
    display: none;
    padding-left: 16px;
  }
  .custom-kei-menu-category:hover > .custom-kei-submenu {
    display: block;
  }
  .custom-kei-menu-item {
    padding: 8px;
    cursor: pointer;
    border-bottom: 1px solid #eee;
  }
  .custom-kei-menu-item:last-child {
    border-bottom: none;
  }
  .custom-kei-menu-item:hover {
    background: #f5f5f5;
  }
  .bpmn-icon-custom-kei {
    display: inline-block;
    width: 24px;
    height: 24px;
    background-image: url('./sustain.png'); /* Update with your icon path */
    background-size: contain;
    background-repeat: no-repeat;
  }
  .bpmn-icon {
    display: inline-block;
    width: 24px;
    height: 24px;
  }
  .bpmn-icon-custom-kei {
    background-size: 24px 20px;
    vertical-align: -6px;
  }
`;
document.head.appendChild(style);
