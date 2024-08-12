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
      this.eventBus.fire('elements.changed', { elements: [newShape] });
    });
  }
  // Add the extractKEIProperties method

  extractKEIProperties(businessObject) {
    console.log('businessObjectMMMMEEEEE', businessObject);
    return {
      kei: businessObject.kei || 'defaultKEI',
      energyConsumption: businessObject.energyConsumption || 0,
      renewableEnergy: businessObject.renewableEnergy || 0,
      nonRenewableEnergy: businessObject.nonRenewableEnergy || 0,
      indoorEnergy: businessObject.indoorEnergy || 0,
      transportationEnergy: businessObject.transportationEnergy || 0,
      singleSourceOfEnergy: businessObject.singleSourceOfEnergy || 0,
      carbonDioxideEmissions: businessObject.carbonDioxideEmissions || 0,
      waterUsage: businessObject.waterUsage || 0,
      wasteGeneration: businessObject.wasteGeneration || 0,
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

    //print the preserved KEI properties for debugging
    console.log('Preserved KEI properties:', keiProperties);

    assign(newBusinessObject, keiProperties);
    this.ensureKEIExtensionElements(newBusinessObject, keiProperties);
    this.modeling.updateProperties(newShape, { businessObject: newBusinessObject });
    this.eventBus.fire('element.changed', { element: newShape });

    // Log the preserved KEI properties for debugging
    console.log('Preserved KEI properties:', keiProperties);
  }
  ensureKEIExtensionElements(businessObject, keiProperties) {
    const moddle = this.bpmnModeler.get('moddle');
    let extensionElements = businessObject.extensionElements;

    // Ensure that extensionElements exists on the businessObject
    if (!extensionElements) {
      extensionElements = moddle.create('bpmn:ExtensionElements');
      businessObject.extensionElements = extensionElements;
    }

    // Initialize the values array if it doesn't exist
    if (!extensionElements.values) {
      extensionElements.values = [];
    }

    // Remove all existing KEI-specific elements before adding the new one
    extensionElements.values = extensionElements.values.filter(el => el.$type === 'sm:Kei' || !el.$type.startsWith('sm:'));

    // Ensure the KEI main element exists or create it
    let keiElement = extensionElements.get('values').find(el => el.$type === 'sm:Kei');
    if (!keiElement) {
      keiElement = moddle.create('sm:Kei', { value: keiProperties.kei });
      extensionElements.get('values').push(keiElement);
    } else {
      keiElement.value = keiProperties.kei;
    }

    // Update the monitored attribute if needed
    if (keiProperties.monitored) {
      keiElement.monitored = 'true';
    } else {
      delete keiElement.monitored;
    }

    // Handle specific KEI elements based on the keiProperties
    const measured = keiProperties.measured;
    this.handleKEIElement('energyConsumption', 'sm:energyConsumption', businessObject, 'energyConsumption', 'kWh', keiProperties.monitored, measured, moddle, extensionElements);
    this.handleKEIElement('renewableEnergy', 'sm:renewableEnergy', businessObject, 'renewableEnergy', 'kWh', keiProperties.monitored, measured, moddle, extensionElements);
    this.handleKEIElement('nonRenewableEnergy', 'sm:nonRenewableEnergy', businessObject, 'nonRenewableEnergy', 'kWh', keiProperties.monitored, measured, moddle, extensionElements);
    this.handleKEIElement('indoorEnergy', 'sm:indoorEnergy', businessObject, 'indoorEnergy', 'kWh', keiProperties.monitored, measured, moddle, extensionElements);
    this.handleKEIElement('transportationEnergy', 'sm:transportationEnergy', businessObject, 'transportationEnergy', 'kWh', keiProperties.monitored, measured, moddle, extensionElements);
    this.handleKEIElement('[singleSourceOfEnergy]', 'sm:singleSourceOfEnergy', businessObject, 'singleSourceOfEnergy', 'kWh', keiProperties.monitored, measured, moddle, extensionElements);
    this.handleKEIElement('carbonDioxideEmissions', 'sm:carbonDioxideEmissions', businessObject, 'carbonDioxideEmissions', 'kg', keiProperties.monitored, measured, moddle, extensionElements);
    this.handleKEIElement('waterUsage', 'sm:waterUsage', businessObject, 'waterUsage', 'liters', keiProperties.monitored, measured, moddle, extensionElements);
    this.handleKEIElement('wasteGeneration', 'sm:wasteGeneration', businessObject, 'wasteGeneration', 'kg', keiProperties.monitored, measured, moddle, extensionElements);
  }

  handleKEIElement(keiType, elementType, businessObject, property, unit, monitored, measured, moddle, extensionElements) {
    if (businessObject.kei === keiType) {
      let keiElement = extensionElements.get('values').find(el => el.$type === elementType);

      const keiValue = measured ? businessObject[property] : null;
      const shouldCreateOrUpdate = keiValue || unit || monitored;

      if (shouldCreateOrUpdate) {
        if (!keiElement) {
          keiElement = moddle.create(elementType, {});
          extensionElements.get('values').push(keiElement);
        }

        if (keiValue) {
          keiElement.value = keiValue;
        } else {
          delete keiElement.value;
        }

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
      } else if (keiElement) {
        extensionElements.get('values').splice(extensionElements.get('values').indexOf(keiElement), 1);
      }
    }
  }


  getContextPadEntries(element) {
    const {
      autoPlace,
      bpmnFactory,
      create,
      elementFactory,
      translate,
      eventBus,
      bpmnModeler,
      modeling,
      elementRegistry,
      popupMenu
    } = this;

    const actions = {}; const editTaskKEI = (event, element) => {
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

            businessObject.kei = kei;
            businessObject.measured = measured;
            businessObject.monitored = monitored;

            this.ensureKEIExtensionElements(businessObject, { kei, monitored, measured });
            eventBus.fire('element.changed', { element });
            if (measured) {
              if (kei === 'energyConsumption') {
                const kwh = prompt('Enter the number of kWh:');
                businessObject.energyConsumption = kwh;
              } else if (kei === 'renewableEnergy') {
                const source = prompt('Enter the number of kWh for :');
                businessObject.renewableEnergy = source;
              } else if (kei === 'nonRenewableEnergy') {
                const source = prompt('Enter the number of kWh for non-renewable energy:');
                businessObject.nonRenewableEnergy = source;
              } else if (kei === 'indoorEnergy') {
                const usage = prompt('Enter the number of kWh for indoor energy usage:');
                businessObject.indoorEnergy = usage;
              } else if (kei === 'transportationEnergy') {
                const usage = prompt('Enter the number of kWh for transportation energy usage:');
                businessObject.transportationEnergy = usage;
              } else if (kei === '[singleSourceOfEnergy]') {
                const source = prompt('Enter the number of kWh for single source of energy:');
                businessObject.singleSourceOfEnergy = source;
              } else if (kei === 'carbonDioxideEmissions') {
                const kgs = prompt('Enter the number of kilograms of CO2:');
                businessObject.carbonDioxideEmissions = kgs;
              } else if (kei === 'waterUsage') {
                const liters = prompt('Enter the number of liters:');
                businessObject.waterUsage = liters;
              } else if (kei === 'wasteGeneration') {
                const kgs = prompt('Enter the number of kilograms:');
                businessObject.wasteGeneration = kgs;
              }
            }


            if (monitored) {
              businessObject.monitored = true;
            }
            businessObject.kei = kei;
            this.ensureKEIExtensionElements(businessObject, { kei, monitored });
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
            //print position for debugging

          });
          popupMenu.open(element, 'bpmn-replace', position, {
            title: translate('Change element'),
            width: 300,
            search: true
          });
          //print element
          console.log('Elementtype:', element);
          // Listen for the replace event and reapply KEI properties to the new element
          const onReplace = ({ context }) => {
            const { newShape } = context;
            const newBusinessObject = newShape.businessObject;
            assign(newBusinessObject, keiProperties);
            console.log('New business object:', newBusinessObject);
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
