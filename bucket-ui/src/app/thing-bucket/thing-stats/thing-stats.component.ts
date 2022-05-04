import { Component, OnInit } from '@angular/core';
import { Chart, PieController, ArcElement, CategoryScale, LinearScale, BarController, BarElement, Tooltip } from 'chart.js';
import { ThingService } from 'app/thing-bucket/services/thing.service';

import * as moment from 'moment'
import { colors, Period, periods } from './chart-elements';

Chart.register(PieController, ArcElement, CategoryScale, LinearScale, BarController, BarElement, Tooltip)

@Component({
  selector: 'app-thing-stats',
  templateUrl: './thing-stats.component.html'
})
export class ThingStatsComponent implements OnInit {

  public colors: string[]

  public periods: Map<string, Period>
  public selectedPeriod: Period
  public dpChart: Chart

  public canvas: any;
  public ctx;
  public chartColor;
  public chartTypes;
  public chartHours;

  constructor(private thingService: ThingService) {
    this.periods = periods
    this.colors = colors
    this.selectedPeriod = this.periods.get('1-past-day')
  }

  async ngOnInit(): Promise<void> {
    const thingsAll = await this.thingService.dpCount('now()-520w')
    if (thingsAll.length > 0) {
      this.buildChartTypes(thingsAll)
      const things1d = await this.thingService.dpCount(this.selectedPeriod.duration, this.selectedPeriod.interval)
      this.buildDataPointsChart(things1d)
    } else {
      // if there is no things yet, we skip the statistics all together
      document.getElementById('stats-panel').style.display = 'none';
    }
  }



  async selectPeriod(periodKey: string) {
    this.selectedPeriod = this.periods.get(periodKey)
    const thingsDataPoints = await this.thingService.dpCount(this.selectedPeriod.duration, this.selectedPeriod.interval)
    this.buildDataPointsChart(thingsDataPoints)
  }

  buildChartTypes(things) {
    this.canvas = document.getElementById('chartTypes');
    const types: any = {}
    let legend = ''
    const selectedColors = []
    const labels = []
    let colorIndex = 0;
    for (let i = 0; i < things.length; i++) {
      for (let j = 0; j < things[i].properties.length; j++) {
        const values = things[i].properties[j].values
        if (types[things[i].properties[j].type.id] === undefined) {
          const color = this.colors[colorIndex]
          selectedColors.push(color)
          labels.push(things[i].properties[j].type.name)
          legend += '<i class="fa fa-circle" style="color:' + color + ';padding-left:3px"></i> ' + things[i].properties[j].type.name + '<br>'
          types[things[i].properties[j].type.id] = 0
        }
        if (values.length === 1) {
          let sum = 0
          for (let l = 1; l < values[0].length; l++) {
            sum += values[0][l]
          }
          types[things[i].properties[j].type.id] += sum
        }
        colorIndex++
      }
    }

    const data = []
    for (const key of Object.keys(types)) {
      data.push(types[key])
    }

    this.ctx = this.canvas.getContext('2d');
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
          },
        },
      }
    });
    document.getElementById('typesChartLegend').innerHTML = legend
  }

  async buildDataPointsChart(things) {
    const datasets = []
    let labels = []

    let legend = ''

    let colorIndex = 0
    for (let i = 0; i < things.length; i++) {
      for (let j = 0; j < things[i].properties.length; j++) {
        const values = things[i].properties[j].values
        const points = []
        const labelTime = []
        for (let k = 0; k < values.length; k++) {
          let sum = 0
          if (labels.length === 0) {
            labelTime.push(moment(values[k][0]).format(this.selectedPeriod.timeFormat))
          }
          for (let l = 1; l < values[k].length; l++) {
            sum += values[k][l]
          }
          points.push(sum)
        }
        if (labels.length < labelTime.length) {
          labels = labelTime;
        }
        const color = this.colors[colorIndex];
        legend += '<i class="fa fa-circle" style="color:' + color + ';padding-left:3px"></i> ' + things[i].properties[j].name
        datasets.push({
          label: things[i].properties[j].name,
          data: points,
          fill: false,
          borderColor: color,
          backgroundColor: color,
          pointBorderColor: color,
          pointRadius: 3,
          pointHoverRadius: 3,
          pointBorderWidth: 8
        })
        colorIndex++
      }
    }


    const dpCount = {
      labels: labels,
      datasets: datasets
    };

    const dpCanvas = document.getElementById('dpChart') as HTMLCanvasElement;
    dpCanvas.innerHTML = ''
    if (this.dpChart !== undefined) {
      this.dpChart.destroy()
    }
    this.dpChart = new Chart(dpCanvas, {
      type: 'bar',
      data: dpCount,
      options: {
        plugins: {
          legend: {
            display: false,
            position: 'top'
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

    document.getElementById('dpChartLegend').innerHTML = legend
  }

  example() {
    this.chartColor = '#FFFFFF';

    this.canvas = document.getElementById('chartHours');
    this.ctx = this.canvas.getContext('2d');

    this.chartHours = new Chart(this.ctx, {
      type: 'line',

      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
        datasets: [{
          borderColor: '#6bd098',
          backgroundColor: '#6bd098',
          pointRadius: 0,
          pointHoverRadius: 0,
          borderWidth: 3,
          data: [300, 310, 316, 322, 330, 326, 333, 345, 338, 354]
        },
        {
          borderColor: '#f17e5d',
          backgroundColor: '#f17e5d',
          pointRadius: 0,
          pointHoverRadius: 0,
          borderWidth: 3,
          data: [320, 340, 365, 360, 370, 385, 390, 384, 408, 420]
        },
        {
          borderColor: '#fcc468',
          backgroundColor: '#fcc468',
          pointRadius: 0,
          pointHoverRadius: 0,
          borderWidth: 3,
          data: [370, 394, 415, 409, 425, 445, 460, 450, 478, 484]
        }
        ]
      },
      options: {
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: false
          }
        },

        scales: {
          y: {
            ticks: {
              maxTicksLimit: 5
            }
          },

          x: {
            ticks: {
              padding: 20
            }
          }
        },
      }
    });
  }
}
