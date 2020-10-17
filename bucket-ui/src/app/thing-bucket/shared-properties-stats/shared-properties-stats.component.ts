import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import Chart from 'chart.js';
import { ThingService } from 'app/thing-bucket/services/thing.service';

import * as moment from 'moment'
import { Property } from '@datacentricdesign/types';
import { type } from 'jquery';

export class Period {
  id: string;
  duration: string;
  nameDuration: string;
  interval: string;
  nameInterval: string;
  timeFormat: string;
}

@Component({
  selector: 'shared-properties-stats',
  templateUrl: './shared-properties-stats.component.html'
})
export class SharedPropertiesStatsComponent implements OnInit {

  private _properties: Property[] = []

  @Input() set properties(value: Property[]) {
    this._properties = value;
    this.buildCharts(this._properties)
  }

  @Output() changePeriodEvent = new EventEmitter<Period>();


  colors = [
    "rgb(81,203,206)",
    "rgb(107,208,152)",
    "rgb(81,188,218)",
    "rgb(251,198,88)",
    "rgb(239,129,87)",
    "rgb(102,102,102)",
    "rgb(193,120,193)",
    "rgb(41,102,103)",
    "rgb(54,104,76)",
    "rgb(41,94,109)",
    "rgb(126,99,44)",
    "rgb(120,65,44)",
    "rgb(51,51,51)",
    "rgb(97,60,97)",
    "rgb(168,229,231)",
    "rgb(181,232,204)",
    "rgb(168,222,237)",
    "rgb(253,227,172)",
    "rgb(247,192,171)",
    "rgb(179,179,179)",
    "rgb(224,188,224)",
    "rgb(20,51,52)",
    "rgb(27,52,38)",
    "rgb(20,47,55)",
    "rgb(63,50,22)",
    "rgb(60,32,22)",
    "rgb(26,26,26)",
    "rgb(48,30,48)",
    "rgb(212,242,243)",
    "rgb(218,243,229)",
    "rgb(212,238,246)",
    "rgb(254,241,213)",
    "rgb(251,224,213)",
    "rgb(217,217,217)",
    "rgb(240,221,240)",
    "rgb(61,152,155)",
    "rgb(80,156,114)",
    "rgb(61,141,164)",
    "rgb(188,149,66)",
    "rgb(179,97,65)",
    "rgb(77,77,77)",
    "rgb(145,90,145)",
    "rgb(125,216,218)",
    "rgb(144,220,178)",
    "rgb(125,205,227)",
    "rgb(252,212,130)",
    "rgb(243,161,129)",
    "rgb(140,140,140)",
    "rgb(209,154,209)",
  ]

  public periods: Map<string, Period> = new Map<string, Period>()
  public selectedPeriod: Period
  public dpChart: Chart

  public canvasPie: any;
  public ctx;
  public chartColor;
  public chartTypes;
  public chartHours;

  constructor(private thingService: ThingService) {
    this.periods.set('1-past-day', { id: 'past-day', duration: 'now()-1d', nameDuration: 'last 24h', interval: '1h', nameInterval: 'per hour', timeFormat: 'HH:mm' })
    this.periods.set('2-past-week', { id: 'past-week', duration: 'now()-1w', nameDuration: 'last 7 days', interval: '1d', nameInterval: 'per day', timeFormat: 'DD/MM' })
    this.periods.set('3-past-month', { id: 'past-month', duration: 'now()-30d', nameDuration: 'last 30 days ', interval: '1d', nameInterval: 'per day', timeFormat: 'DD/MM' })
    this.periods.set('4-past-3months', { id: 'past-3months', duration: 'now()-90d', nameDuration: 'last 3 months', interval: '1w', nameInterval: 'per week', timeFormat: 'DD/MM' })
    this.periods.set('5-past-3months', { id: 'past-6months', duration: 'now()-180d', nameDuration: 'last 6 months', interval: '1w', nameInterval: 'per week', timeFormat: 'DD/MM' })
    this.periods.set('6-past-year', { id: 'past-year', duration: 'now()-52w', nameDuration: 'last 12 months', interval: '1w', nameInterval: 'per week', timeFormat: 'DD/MM' })
    this.selectedPeriod = this.periods.get('1-past-day')
    this.changePeriodEvent.emit(this.selectedPeriod)
  }

  async ngOnInit(): Promise<void> {
    if (this._properties.length > 0) {
      this.buildCharts(this._properties)
    }
    this.changePeriodEvent.emit(this.selectedPeriod)
  }

  async selectPeriod(period: Period) {
    this.selectedPeriod = period
    this.changePeriodEvent.emit(this.selectedPeriod)
    // const thingsDataPoints = await this.thingService.dpCount(this.selectedPeriod.duration, this.selectedPeriod.interval)
    // this.buildDataPointsChart(thingsDataPoints)
  }

  async buildCharts(properties: Property[]) {
    const types: any = {}
    let colors = []
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
          color: this.colors[colorIndex],
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
        // console.log(labels)
        for (let l = 1; l < values[k].length; l++) {
          sum += Number.parseInt(values[k][l] as 'number')
        }
        // Add to the sum of DP for this type
        type.sum += sum
        // Add to 
        if (type.points[k] === undefined) {
          type.points.push(sum)
        } else {
          type.points[k] += sum
        }
      }
      if (labelsBar.length < labels.length) labelsBar = labels
      labels = []
    }

    document.getElementById('typesChartLegend').innerHTML = legend

    this.buildPieChart(types)
    this.buildBarChart(labelsBar, types)
  }

  buildPieChart(types) {
    this.canvasPie = document.getElementById("chartTypes");
    let data = []
    let labels = []
    let colors = []
    for (let key in types) {
      labels.push(types[key].name)
      data.push(types[key].sum)
      colors.push(types[key].color)
    }

    this.ctx = this.canvasPie.getContext("2d");
    if (this.chartTypes !== undefined) {
      this.chartTypes.destroy()
    }
    this.chartTypes = new Chart(this.ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          label: "Types",
          pointRadius: 0,
          pointHoverRadius: 0,
          backgroundColor: colors,
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
              zeroLineColor: "transparent",
              color: 'rgba(255,255,255,0.05)'
            }

          }],

          xAxes: [{
            barPercentage: 1.6,
            gridLines: {
              drawBorder: false,
              color: 'rgba(255,255,255,0.1)',
              zeroLineColor: "transparent"
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
    for (let key in types) {
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

    const dpCanvas = document.getElementById("dpChart")
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