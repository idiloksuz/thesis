import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';
import {
  append as svgAppend,
  attr as svgAttr,
  create as svgCreate
} from 'tiny-svg';
import { getRoundRectPath } from 'bpmn-js/lib/draw/BpmnRenderUtil';
import { is, getBusinessObject } from 'bpmn-js/lib/util/ModelUtil';

const HIGH_PRIORITY = 1500,
      TASK_BORDER_RADIUS = 2,
      COLOR_MAP = {
        'energyConsumption': '#52B415',
        'renewableEnergy': '#6c9d1a',
        'nonRenewableEnergy': '#8b0000',
        'indoorEnergy': '#ff8c00',
        'transportationEnergy': '#4682b4',
        '[singleSourceOfEnergy]': '#2e8b57',
        'carbondioxideEmissions': '#ffc800',
        'waterUsage': '#cc0000',
        'wasteGeneration': '#8a2be2',
      };

export default class CustomRenderer extends BaseRenderer {
  constructor(eventBus, bpmnRenderer) {
    super(eventBus, HIGH_PRIORITY);
    this.bpmnRenderer = bpmnRenderer;

    eventBus.on('element.changed', (event) => {
      const element = event.element;
      if (this.canRender(element)) {
        const gfx = this.getGraphics(element);
        // call printGraphics to print the graphics
        this.printGraphics(element);
        this.drawKEI(element, gfx);
        console.log('Element changed:', element);
      }
    });
  }

  canRender(element) {
    const businessObject = element.businessObject;
    return !element.labelTarget && businessObject.kei;
  }

  drawShape(parentNode, element) {
    const shape = this.bpmnRenderer.drawShape(parentNode, element);
    this.drawKEI(element, parentNode);
    console.log('Drawing shape:', element);
    return shape;
  }

  drawKEI(element, parentNode) {
    //print parent node
    if (!parentNode) {
      console.error('parentNode is undefined for element:', element);
      return;
    }

    const shapeHeight = element.height;
    const kei = element.businessObject.kei;
    const keiValue = this.getKEIValue(element.businessObject, kei);

    if (kei) {
      const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      img.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', this.getKEIImagePath(kei));
      img.setAttributeNS(null, 'x', 0);
      img.setAttributeNS(null, 'y', shapeHeight + 5);
      img.setAttributeNS(null, 'width', 24);
      img.setAttributeNS(null, 'height', 24);
      parentNode.appendChild(img);

      const text = svgCreate('text');
      svgAttr(text, {
        x: 30,
        y: shapeHeight + 20,
        'font-size': '12px',
        fill: 'black'
      });
      text.textContent = keiValue;
      svgAppend(parentNode, text);
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
    switch (kei) {
      case 'energyConsumption':
        return `${businessObject.energyConsumption} kWh`;
      case 'renewableEnergy':
        return `${businessObject.renewableEnergy} kWh`;
      case 'nonRenewableEnergy':
        return `${businessObject.nonRenewableEnergy} kWh`;
      case 'indoorEnergy':
        return `${businessObject.indoorEnergy} kWh`;
      case 'transportationEnergy':
        return `${businessObject.transportationEnergy} kWh`;
      case '[singleSourceOfEnergy]':
        return `${businessObject.singleSourceOfEnergy} kWh`;
      case 'carbondioxideEmissions':
        return `${businessObject.carbonDioxideEmissions} kg CO2`;
      case 'waterUsage':
        return `${businessObject.waterUsage} liters`;
      case 'wasteGeneration':
        return `${businessObject.wasteGeneration} kg`;
      default:
        return '';
    }
  }

  getColor(kei) {
    return COLOR_MAP[kei] || '#000';
  }
    // Helper function to get graphics for the element
  getGraphics(element) {
    return element && element.gfx;
  }
  //prin the graphics
  printGraphics(element) {
    const gfx = this.getGraphics(element);
    console.log('Graphics for element:', element, gfx);
  }
}

CustomRenderer.$inject = ['eventBus', 'bpmnRenderer'];

function drawRect(parentNode, width, height, borderRadius, color) {
  const rect = svgCreate('rect');

  svgAttr(rect, {
    width: width,
    height: height,
    rx: borderRadius,
    ry: borderRadius,
    stroke: color,
    strokeWidth: 2,
    fill: color
  });

  svgAppend(parentNode, rect);
  return rect;
}
