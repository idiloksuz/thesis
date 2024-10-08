import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';

import {
  append as svgAppend,
  attr as svgAttr,
  create as svgCreate
} from 'tiny-svg';
import { getRoundRectPath } from 'bpmn-js/lib/draw/BpmnRenderUtil';
import { assign } from 'min-dash';
import { is, getBusinessObject } from 'bpmn-js/lib/util/ModelUtil';

const HIGH_PRIORITY = 1500,
  TASK_BORDER_RADIUS = 2,
  COLOR_MAP = {
    'energyConsumption': '#52B415',
    'renewableEnergy': '#6c9d1a',
    'nonRenewableEnergy': '#8b0000',
    'indoorEnergy': '#ff8c00',
    'transportationEnergy': '#4682b4',
    'carbondioxideEmissions': '#ffc800',
    'waterUsage': '#cc0000',
    'wasteGeneration': '#8a2be2',
  };

export default class CustomRenderer extends BaseRenderer {
  constructor(eventBus, bpmnRenderer, customContextPad) {
    super(eventBus, HIGH_PRIORITY);
    this.bpmnRenderer = bpmnRenderer;
    this.customContextPad = customContextPad; // Store the CustomContextPad instance
  }

  canRender(element) {
    const businessObject = element.businessObject;
    return !element.labelTarget && businessObject && businessObject.kei;
  }

  drawShape(parentNode, element) {
    const shape = this.bpmnRenderer.drawShape(parentNode, element);
    this.drawKEI(element, parentNode);
    return shape;
  }
  drawKEI(element, parentNode) {
    if (!parentNode) {
      console.error('parentNode is undefined for element:', element);
      return;
    }

    const shapeHeight = element.height;
    const businessObject = element.businessObject;
    const kei = businessObject.kei;
    const keiValue = this.getKEIValue(businessObject, kei); // Retrieve the KEI value

    if (kei) {
      const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      img.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', this.getKEIImagePath(kei));
      img.setAttributeNS(null, 'x', 0);
      img.setAttributeNS(null, 'y', -30); // Adjust this value to position the icon above the shape
      img.setAttributeNS(null, 'width', 24);
      img.setAttributeNS(null, 'height', 24);
      parentNode.appendChild(img);

      const text = svgCreate('text');
      svgAttr(text, {
        x: 30,
        y: -15, // Position above the shape
        'font-size': '14px',
        fill: '#000000',
        opacity: 1,
      });
      text.textContent = keiValue;
      svgAppend(parentNode, text);

      // Add monitored status
      if (businessObject.monitored) {
        const monitoredText = svgCreate('text');
        svgAttr(monitoredText, {
          x: 30,
          y: -5, // Position above the shape, below the KEI value
          'font-size': '12px',
          fill: '#FF0000', // Red color for visibility
          opacity: 1,
        });
        monitoredText.textContent = 'Monitored';
        svgAppend(parentNode, monitoredText);
      }
    }
  }

  getShapePath(shape) {
    if (is(shape, 'bpmn:Task') || is(shape, 'bpmn:ServiceTask') || is(shape, 'bpmn:UserTask') || is(shape, 'bpmn:ManualTask') || is(shape, 'bpmn:BusinessRuleTask')) {
      return getRoundRectPath(shape, TASK_BORDER_RADIUS);
    }
    return this.bpmnRenderer.getShapePath(shape);
  }

  getKEIImagePath(kei) {
    switch (kei) {
      case 'energyConsumption':
        return './energyConsumption.jpg';
      case 'renewableEnergy':
        return './renewableEnergy.jpg';
      case 'nonRenewableEnergy':
        return './nonRenewableEnergy.jpg';
      case 'indoorEnergy':
        return './indoorEnergy.jpg';
      case 'transportationEnergy':
        return './transportationEnergy.jpg';
      case 'carbondioxideEmissions':
        return './carbonDioxideEmissions.jpg';
      case 'waterUsage':
        return './waterUsage.png';
      case 'wasteGeneration':
        return './wasteGeneration.png';
      default:
        return '';
    }
  }

  getKEIValue(businessObject, kei) {
    let value = businessObject[kei];
    let unit;

    switch (kei) {
      case 'energyConsumption':
        unit = 'kWh';
        break;
      case 'renewableEnergy':
        unit = 'kWh';
        break;
      case 'nonRenewableEnergy':
        unit = 'kWh';
        break;
      case 'indoorEnergy':
        unit = 'kWh';
        break;
      case 'transportationEnergy':
        unit = 'kWh';
        break;
      case 'carbonDioxideEmissions':
        unit = 'kg CO2';
        break;
      case 'waterUsage':
        unit = 'liters';
        break;
      case 'wasteGeneration':
        unit = 'kg';
        break;
      default:
        return '';
    }

    // Return "undefined kWh" if measured but no value is given
    if (businessObject.measured && (value === undefined || value === null)) {
      return `undefined ${unit}`;
    }

    return `${value || 'undefined'} ${unit}`;
  }

  getGraphics(element) {
    return element && element.gfx;
  }
}

CustomRenderer.$inject = ['eventBus', 'bpmnRenderer'];
