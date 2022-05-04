import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ArcElement, BarController, BarElement, CategoryScale, Chart, LinearScale, PieController, Tooltip } from 'chart.js';
import { ThingService } from 'app/thing-bucket/services/thing.service';

import * as moment from 'moment'
import { Property } from '@datacentricdesign/types';
import { colors, Period, periods } from '../thing-stats/chart-elements';


Chart.register(PieController, ArcElement, CategoryScale, LinearScale, BarController, BarElement, Tooltip)

@Component({
  selector: 'app-shared-properties-stats',
  templateUrl: './shared-properties-stats.component.html'
})
export class SharedPropertiesStatsComponent implements OnInit {

  private _properties: Property[] = []

  @Input() set properties(value: Property[]) {
    this._properties = value;
    if (this._properties.length > 0) {
      this.buildCharts(this._properties)
    }
  }

  @Output() changePeriodEvent = new EventEmitter<Period>();

  public periods: Map<string, Period>
  public selectedPeriod: Period
  public dpChart: Chart

  public canvasPie: any;
  public ctx;
  public chartColor;
  public chartTypes;
  public chartHours;

  constructor(private thingService: ThingService) {
    this.periods = periods
    this.selectedPeriod = this.periods.get('1-past-day')
    this.changePeriodEvent.emit(this.selectedPeriod)
  }

  public getProperties() {
    return this._properties;
  }

  async ngOnInit(): Promise<void> {
    if (this._properties.length > 0) {
      this.buildCharts(this._properties)
    }
    this.changePeriodEvent.emit(this.selectedPeriod)
  }

  async selectPeriod(periodKey: string) {
    this.selectedPeriod = this.periods.get(periodKey)
    this.changePeriodEvent.emit(this.selectedPeriod)
  }

  async buildCharts(properties: Property[]) {
    const types: any = {}
    let labelsBar = []

    let legend = ''

    let colorIndex = 0
    let labels = []
    for (let j = 0; j < properties.length; j++) {
      // Double check there are values, otherwise skip this property
      const values = properties[j].values
      if (values === undefined) {
        continue
      }

      // Is it a new type?
      let type = types[properties[j].type.id]
      if (type === undefined) {
        // Init number of data points for this type
        type = {
          name: properties[j].type.name,
          color: colors[colorIndex],
          sum: 0,
          points: []
        }
        types[properties[j].type.id] = type
        legend += '<i class="fa fa-circle" style="color:' + type.color + ';padding-left:3px"></i> ' + type.name
        colorIndex++
      }

      for (let k = 0; k < values.length; k++) {
        let sum = 0
        const label = moment(values[k][0]).format(this.selectedPeriod.timeFormat)
        labels.push(label)
        for (let l = 1; l < values[k].length; l++) {
          sum += Number.parseInt(values[k][l] as 'number', 10)
        }
        // Add to the sum of DP for this type
        type.sum += sum
        if (type.points[k] === undefined) {
          type.points.push(sum)
        } else {
          type.points[k] += sum
        }
      }
      if (labelsBar.length < labels.length) {
        labelsBar = labels
      }
      labels = []
    }

    document.getElementById('typesChartLegend').innerHTML = legend

    this.buildPieChart(types)
    this.buildBarChart(labelsBar, types)
  }

  buildPieChart(types) {
    this.canvasPie = document.getElementById('types-pie-chart');
    const data = []
    const labels = []
    const selectedColors = []
    for (const key of Object.keys(types)) {
      labels.push(types[key].name)
      data.push(types[key].sum)
      selectedColors.push(types[key].color)
    }

    this.ctx = this.canvasPie.getContext('2d');
    if (this.chartTypes !== undefined) {
      this.chartTypes.destroy()
    }
    this.chartTypes = new Chart(this.ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          label: 'Types',
          backgroundColor: selectedColors,
          borderWidth: 0,
          data: data
        }]
      },

      options: {
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: true
          }
        },
      }
    });
  }

  buildBarChart(labels, types) {
    const datasets = []
    for (const key of Object.keys(types)) {
      const type = types[key]
      datasets.push({
        label: type.name,
        data: type.points,
        borderColor: type.color,
        backgroundColor: type.color,
        pointBorderColor: type.color,
        pointRadius: 3,
        pointHoverRadius: 3,
        pointBorderWidth: 8
      })
    }

    const dpCount = {
      labels: labels,
      datasets: datasets
    };

    const dpCanvas = document.getElementById('datapoint-bar-chart') as HTMLCanvasElement;
    dpCanvas.innerHTML = ''
    if (this.dpChart !== undefined) {
      this.dpChart.destroy()
    }
    this.dpChart = new Chart(dpCanvas, {
      type: 'bar',
      data: dpCount,
      options: {
        aspectRatio: 4,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            stacked: true,
          },
          y: {
            stacked: true
          }
        }
      }
    });
  }

}
