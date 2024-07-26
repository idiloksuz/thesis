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
        'Energy consumption': '#52B415',
        'Carbondioxide emissions': '#ffc800',
        'Water usage': '#cc0000',
        'Waste generation': '#8a2be2',
      };

export default class CustomRenderer extends BaseRenderer {
  constructor(eventBus, bpmnRenderer) {
    super(eventBus, HIGH_PRIORITY);
    this.bpmnRenderer = bpmnRenderer;
  }

  canRender(element) {
    const businessObject = element.businessObject;
    // Ensure we are not rendering labels
    return !element.labelTarget && (
      businessObject.kei === 'Energy consumption' || 
      businessObject.kei === 'Carbondioxide emissions' ||
      businessObject.kei === 'Water usage' ||
      businessObject.kei === 'Waste generation'
    );
  }

  drawShape(parentNode, element) {
    const shape = this.bpmnRenderer.drawShape(parentNode, element);
    const shapeHeight = shape.getBBox().height;

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

    return shape;
  }

  getShapePath(shape) {
    if (is(shape, 'bpmn:Task') || is(shape, 'bpmn:ServiceTask') || is(shape, 'bpmn:UserTask') || is(shape, 'bpmn:ManualTask') || is(shape, 'bpmn:BusinessRuleTask')) {
      return getRoundRectPath(shape, TASK_BORDER_RADIUS);
    }
    return this.bpmnRenderer.getShapePath(shape);
  }

  getKEIImagePath(kei) {
    switch (kei) {
      case 'Energy consumption':
        return './energyConsumption.jpg';
      case 'Carbondioxide emissions':
        return './carbonDioxideEmissions.jpg';
      case 'Water usage':
        return './waterUsage.png';
      case 'Waste generation':
        return './wasteGeneration.png';
      default:
        return '';
    }
  }

  getKEIValue(businessObject, kei) {
    switch (kei) {
      case 'Energy consumption':
        return `${businessObject.energyConsumption} kWh`;
      case 'Carbondioxide emissions':
        return `${businessObject.carbonDioxideEmissions} kg CO2`;
      case 'Water usage':
        return `${businessObject.waterUsage} liters`;
      case 'Waste generation':
        return `${businessObject.wasteGeneration} kg`;
      default:
        return '';
    }
  }

  getColor(kei) {
    return COLOR_MAP[kei] || '#000';
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
