import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import Chart from 'chart.js';
import { ThingService } from 'app/thing-bucket/services/thing.service';

import * as moment from 'moment'
import { Property } from '@datacentricdesign/types';
import { colors, Period, periods } from '../thing-stats/chart-elements';

@Component({
  selector: 'app-shared-properties-stats',
  templateUrl: './shared-properties-stats.component.html'
})
export class SharedPropertiesStatsComponent implements OnInit {

  private _properties: Property[] = []

  @Input() set properties(value: Property[]) {
    this._properties = value;
    this.buildCharts(this._properties)
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

  async ngOnInit(): Promise<void> {
    if (this._properties.length > 0) {
      this.buildCharts(this._properties)
    }
    this.changePeriodEvent.emit(this.selectedPeriod)
  }

  async selectPeriod(periodKey: string) {
    this.selectedPeriod = this.periods[periodKey]
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
    this.canvasPie = document.getElementById('chartTypes');
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
          pointRadius: 0,
          pointHoverRadius: 0,
          backgroundColor: selectedColors,
          borderWidth: 0,
          data: data
        }]
      },

      options: {

        legend: {
          display: false
        },

        pieceLabel: {
          render: 'percentage',
          fontColor: ['white'],
          precision: 2
        },

        tooltips: {
          enabled: true
        },

        scales: {
          yAxes: [{

            ticks: {
              display: false
            },
            gridLines: {
              drawBorder: false,
              zeroLineColor: 'transparent',
              color: 'rgba(255,255,255,0.05)'
            }

          }],

          xAxes: [{
            barPercentage: 1.6,
            gridLines: {
              drawBorder: false,
              color: 'rgba(255,255,255,0.1)',
              zeroLineColor: 'transparent'
            },
            ticks: {
              display: false,
            }
          }]
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

    const chartOptions = {
      aspectRatio: 4,
      legend: {
        display: false
      },
      scales: {
        xAxes: [{
          stacked: true,
        }],
        yAxes: [{
          stacked: true
        }]
      }
    };

    const dpCanvas = document.getElementById('dpChart')
    dpCanvas.innerHTML = ''
    if (this.dpChart !== undefined) {
      this.dpChart.destroy()
    }
    this.dpChart = new Chart(dpCanvas, {
      type: 'bar',
      hover: false,
      data: dpCount,
      options: chartOptions
    });
  }

}
