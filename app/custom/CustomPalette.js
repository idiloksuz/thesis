import { assign } from 'min-dash';
import { is } from 'bpmn-js/lib/util/ModelUtil';

export default class CustomPalette {
  constructor(bpmnFactory, create, elementFactory, palette, translate, modeling, elementRegistry, eventBus) {
    this.bpmnFactory = bpmnFactory;
    this.create = create;
    this.elementFactory = elementFactory;
    this.translate = translate;
    this.modeling = modeling;
    this.elementRegistry = elementRegistry;
    this.eventBus = eventBus;

    palette.registerProvider(this);
  }

  getPaletteEntries(element) {
    const {
      translate
    } = this;

    // Define custom palette entries
    const entries = {
      'replace-task': {
        group: 'edit',
        className: 'bpmn-icon-screw-wrench',
        title: translate('Change element'),
        action: {
          click: (event) => {
            const shape = element;
            const newType = 'bpmn:ServiceTask'; // Specify the new type

            this.replaceElement(shape, newType);
          }
        }
      },
      // Add other palette entries as needed
    };

    return entries;
  }

  replaceElement(element, newType) {
    const businessObject = element.businessObject;
  
    // Extract KEI properties from the current element
    const keiProperties = this.extractKEIProperties(businessObject);
  
    console.log('Replacing element, storing KEI Properties:', keiProperties);
  
    // Create a new element of the specified type
    const newElement = this.elementFactory.createShape({
      type: newType,
      businessObject: this.bpmnFactory.create(newType)
    });
  
    // Apply the KEI properties to the new element's businessObject
    assign(newElement.businessObject, keiProperties);
  
    // Replace the old element with the new element
    const replacedElement = this.modeling.replaceShape(element, newElement);
  
    // Ensure KEI extension elements are correctly handled during the replacement
    this.ensureKEIExtensionElements(replacedElement.businessObject, keiProperties);
  
    // Fire element changed event to trigger the rendering of the KEI
    this.eventBus.fire('elements.changed', { elements: [replacedElement] });
  }
  
  extractKEIProperties(businessObject) {
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
  

  ensureKEIExtensionElements(businessObject, keiProperties) {
    const moddle = this.bpmnFactory._modeler.get('moddle');
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
}

CustomPalette.$inject = [
  'bpmnFactory',
  'create',
  'elementFactory',
  'palette',
  'translate',
  'modeling',
  'elementRegistry',
  'eventBus'
];
