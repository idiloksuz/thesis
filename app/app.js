import BpmnModeler from 'bpmn-js/lib/Modeler';
import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil';
import CustomPalette from '/Users/idiloksuz/Desktop/bp/app/custom/CustomPalette.js';
import CustomContextPad from '/Users/idiloksuz/Desktop/bp/app/custom/CustomContextPad.js';
import CustomRenderer from '/Users/idiloksuz/Desktop/bp/app/custom/CustomRenderer.js';
import diagramXML from '../resources/diagram.bpmn';
import customModule from './custom';
import qaExtension from '../resources/qa';
import { saveAs } from 'file-saver';

const HIGH_PRIORITY = 1500;

document.addEventListener('DOMContentLoaded', () => {
  const containerEl = document.getElementById('container');
  const formEl = document.getElementById('form');
  const qualityAssuranceEl = document.getElementById('quality-assurance');
  const keisEl = document.getElementById('keis');
  const lastCheckedEl = document.getElementById('last-checked');
  const okayEl = document.getElementById('okay');
  const warningEl = document.getElementById('warning');
  const saveButtonEl = document.getElementById('save-button');
  let currentElement, businessObject;

  const keis = [
    "Energy consumption",
    "Carbon-dioxide emissions",
    "Water usage",
    "Waste generation",
    "Resource efficiency"
  ];

  // Populate KEIs dropdown
  keis.forEach(kei => {
    const option = document.createElement('option');
    option.value = kei;
    option.textContent = kei;
  });

  // Hide quality assurance if user clicks outside
  window.addEventListener('click', (event) => {
    const { target } = event;
    if (target === qualityAssuranceEl || qualityAssuranceEl.contains(target)) {
      return;
    }
    qualityAssuranceEl.classList.add('hidden');
  });

  // Validation function
  function validate() {
    const value = keisEl.value;
    if (!value) {
      warningEl.classList.remove('hidden');
      okayEl.disabled = true;
    } else {
      warningEl.classList.add('hidden');
      okayEl.disabled = false;
    }
  }

  keisEl.addEventListener('input', validate);
  const bpmnModeler = new BpmnModeler({
    container: '#container',
    additionalModules: [
      customModule,
      {
        __init__: ['customPalette', 'customContextPad', 'customRenderer'],
        customPalette: ['type', CustomPalette],
        customContextPad: ['type', CustomContextPad],
        customRenderer: ['type', CustomRenderer]
      }
    ],
    moddleExtensions: {
      qa: qaExtension
    }
  });
  
  bpmnModeler.importXML(diagramXML, (err) => {
    if (err) {
      console.error('Failed to import diagram', err);
    } else {
      console.log('Diagram imported successfully');
      // Set bpmnModeler to CustomContextPad instance
      const customContextPad = bpmnModeler.get('customContextPad');
      customContextPad.setBpmnModeler(bpmnModeler);
    }
  });
  
  document.getElementById('save-button').addEventListener('click', (e) => {
    e.preventDefault();
    bpmnModeler.saveXML({ format: true }).then(result => {
      const blob = new Blob([result.xml], { type: 'application/xml' });
      saveAs(blob, 'diagram.bpmn');
    }).catch(err => console.error(err));
  });
  // Open quality assurance if user right clicks on element
  bpmnModeler.on('element.contextmenu', HIGH_PRIORITY, (event) => {
    event.originalEvent.preventDefault();
    event.originalEvent.stopPropagation();

    qualityAssuranceEl.classList.remove('hidden');

    currentElement = event.element;

    // Ignore root element
    if (!currentElement.parent) {
      return;
    }

    businessObject = getBusinessObject(currentElement);
    const selectedKEI = businessObject.kei || '';

    keisEl.value = selectedKEI;
    keisEl.focus();

    const analysisDetails = getExtensionElement(businessObject, 'qa:AnalysisDetails');
    lastCheckedEl.textContent = analysisDetails ? analysisDetails.lastChecked : '-';

    validate();
  });

  // Set KEI and last checked if user submits
  formEl.addEventListener('submit', (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!businessObject) {
      console.error('No businessObject found');
      return;
    }

    const selectedKEI = keisEl.value;
    const moddle = bpmnModeler.get('moddle');
    let extensionElements = businessObject.extensionElements;

    if (!extensionElements) {
      extensionElements = moddle.create('bpmn:ExtensionElements');
      businessObject.extensionElements = extensionElements;
    }

    let analysisDetails = getExtensionElement(businessObject, 'qa:AnalysisDetails');

    if (!analysisDetails) {
      analysisDetails = moddle.create('qa:AnalysisDetails');
      extensionElements.get('values').push(analysisDetails);
    }

    analysisDetails.lastChecked = new Date().toISOString();

    bpmnModeler.get('modeling').updateProperties(currentElement, {
      extensionElements: businessObject.extensionElements,
      kei: selectedKEI
    });

    // Force a refresh of the element's visual representation
    const updatedElement = bpmnModeler.get('elementRegistry').get(currentElement.id);
    bpmnModeler.get('graphicsFactory').update('shape', updatedElement);

    qualityAssuranceEl.classList.add('hidden');
  });

  // Save button click event
 
  
saveButtonEl.addEventListener('click', (e) => {
  e.preventDefault();
  bpmnModeler.saveXML({ format: true }).then(result => {
    const blob = new Blob([result.xml], { type: 'application/xml' });
    saveAs(blob, 'diagram.bpmn');
  }).catch(err => console.error(err));
});

  // Close quality assurance if user presses escape
  formEl.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      qualityAssuranceEl.classList.add('hidden');
    }
  });

  function getExtensionElement(element, type) {
    if (!element.extensionElements) {
      return;
    }
    return element.extensionElements.values.filter(extensionElement => {
      return extensionElement.$instanceOf(type);
    })[0];
  }

  function getBusinessObject(element) {
    return element.businessObject || element;
  }
});
