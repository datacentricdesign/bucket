import { Component, OnInit } from '@angular/core';
import Chart from 'chart.js';
import { ThingService } from 'app/thing-bucket/services/thing.service';

import * as moment from 'moment'

@Component({
  selector: 'app-thing-stats',
  templateUrl: './thing-stats.component.html',
  styleUrls: ['./thing-stats.component.css']
})
export class ThingStatsComponent implements OnInit {

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

  public canvas: any;
  public ctx;
  public chartColor;
  public chartTypes;
  public chartHours;

  constructor(private thingService: ThingService) { }

  async ngOnInit(): Promise<void> {
    const thingsAll = await this.thingService.dpCount('now()-52w')
    if (thingsAll.length > 0) {
      this.buildChartTypes(thingsAll)
      const things1d = await this.thingService.dpCount('now()-1d', '1h')
      this.buildDataPointsChart(things1d)
    } else {
      // if there is no things yet, we skip the statistics all together
      document.getElementById('stats-panel').style.display = 'none';
    }
  }

  buildChartTypes(things) {
    this.canvas = document.getElementById("chartTypes");
    const types: any = {}
    let legend = ''
    let colors = []
    let labels = []
    let colorIndex = 0;
    for (let i = 0; i < things.length; i++) {
      for (let j = 0; j < things[i].properties.length; j++) {
        const values = things[i].properties[j].values
        if (types[things[i].properties[j].type.id] === undefined) {
          const color = this.colors[colorIndex]
          colors.push(color)
          labels.push(things[i].properties[j].type.name)
          legend += '<i class="fa fa-circle" style="color:' + color + ';padding-left:3px"></i> ' + things[i].properties[j].type.name + '<br>'
          types[things[i].properties[j].type.id] = 0
        }
        if (values.length == 1) {
          let sum = 0
          for (let l = 1; l < values[0].length; l++) {
            sum += values[0][l]
          }
          types[things[i].properties[j].type.id] += sum
        }
        colorIndex++
      }
    }

    let data = []
    for (let key in types) {
      data.push(types[key])
    }

    this.ctx = this.canvas.getContext("2d");
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
    document.getElementById('typesChartLegend').innerHTML = legend
  }

  async buildDataPointsChart(things) {

    var dpCanvas = document.getElementById("dpChart");
    let datasets = []
    let labels = [];

    let legend = ''

    let colorIndex = 0
    for (let i = 0; i < things.length; i++) {
      for (let j = 0; j < things[i].properties.length; j++) {
        const values = things[i].properties[j].values
        let points = []
        let labelTime = []
        for (let k = 0; k < values.length; k++) {
          let sum = 0
          if (labels.length === 0) labelTime.push(moment(values[k][0]).format('HH:mm'))
          for (let l = 1; l < values[k].length; l++) {
            sum += values[k][l]
          }
          points.push(sum)
        }
        if (labels.length < labelTime.length) labels = labelTime;
        const color = this.colors[colorIndex];
        legend += '<i class="fa fa-circle" style="color:' + color + ';padding-left:3px"></i> ' + things[i].properties[j].name
        datasets.push({
          label: things[i].properties[j].name,
          data: points,
          fill: false,
          borderColor: color,
          backgroundColor: 'transparent',
          pointBorderColor: color,
          pointRadius: 3,
          pointHoverRadius: 3,
          pointBorderWidth: 8
        })
        colorIndex++
      }
    }

    var dpCount = {
      labels: labels,
      datasets: datasets
    };

    var chartOptions = {
      legend: {
        display: false,
        position: 'top'
      }
    };

    var lineChart = new Chart(dpCanvas, {
      type: 'line',
      hover: false,
      data: dpCount,
      options: chartOptions
    });

    document.getElementById('dpChartLegend').innerHTML = legend
  }

  example() {
    this.chartColor = "#FFFFFF";

    this.canvas = document.getElementById("chartHours");
    this.ctx = this.canvas.getContext("2d");

    this.chartHours = new Chart(this.ctx, {
      type: 'line',

      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"],
        datasets: [{
          borderColor: "#6bd098",
          backgroundColor: "#6bd098",
          pointRadius: 0,
          pointHoverRadius: 0,
          borderWidth: 3,
          data: [300, 310, 316, 322, 330, 326, 333, 345, 338, 354]
        },
        {
          borderColor: "#f17e5d",
          backgroundColor: "#f17e5d",
          pointRadius: 0,
          pointHoverRadius: 0,
          borderWidth: 3,
          data: [320, 340, 365, 360, 370, 385, 390, 384, 408, 420]
        },
        {
          borderColor: "#fcc468",
          backgroundColor: "#fcc468",
          pointRadius: 0,
          pointHoverRadius: 0,
          borderWidth: 3,
          data: [370, 394, 415, 409, 425, 445, 460, 450, 478, 484]
        }
        ]
      },
      options: {
        legend: {
          display: false
        },

        tooltips: {
          enabled: false
        },

        scales: {
          yAxes: [{

            ticks: {
              fontColor: "#9f9f9f",
              beginAtZero: false,
              maxTicksLimit: 5,
              //padding: 20
            },
            gridLines: {
              drawBorder: false,
              zeroLineColor: "#ccc",
              color: 'rgba(255,255,255,0.05)'
            }

          }],

          xAxes: [{
            barPercentage: 1.6,
            gridLines: {
              drawBorder: false,
              color: 'rgba(255,255,255,0.1)',
              zeroLineColor: "transparent",
              display: false,
            },
            ticks: {
              padding: 20,
              fontColor: "#9f9f9f"
            }
          }]
        },
      }
    });
  }
}