
export const colors = [
    'rgb(81,203,206)',
    'rgb(107,208,152)',
    'rgb(81,188,218)',
    'rgb(251,198,88)',
    'rgb(239,129,87)',
    'rgb(102,102,102)',
    'rgb(193,120,193)',
    'rgb(41,102,103)',
    'rgb(54,104,76)',
    'rgb(41,94,109)',
    'rgb(126,99,44)',
    'rgb(120,65,44)',
    'rgb(51,51,51)',
    'rgb(97,60,97)',
    'rgb(168,229,231)',
    'rgb(181,232,204)',
    'rgb(168,222,237)',
    'rgb(253,227,172)',
    'rgb(247,192,171)',
    'rgb(179,179,179)',
    'rgb(224,188,224)',
    'rgb(20,51,52)',
    'rgb(27,52,38)',
    'rgb(20,47,55)',
    'rgb(63,50,22)',
    'rgb(60,32,22)',
    'rgb(26,26,26)',
    'rgb(48,30,48)',
    'rgb(212,242,243)',
    'rgb(218,243,229)',
    'rgb(212,238,246)',
    'rgb(254,241,213)',
    'rgb(251,224,213)',
    'rgb(217,217,217)',
    'rgb(240,221,240)',
    'rgb(61,152,155)',
    'rgb(80,156,114)',
    'rgb(61,141,164)',
    'rgb(188,149,66)',
    'rgb(179,97,65)',
    'rgb(77,77,77)',
    'rgb(145,90,145)',
    'rgb(125,216,218)',
    'rgb(144,220,178)',
    'rgb(125,205,227)',
    'rgb(252,212,130)',
    'rgb(243,161,129)',
    'rgb(140,140,140)',
    'rgb(209,154,209)',
]

export class Period {
    id: string;
    duration: string;
    nameDuration: string;
    interval: string;
    nameInterval: string;
    timeFormat: string;
  }

export const periods = new Map<string, Period>()

periods.set('1-past-day', {
    id: 'past-day',
    duration: 'now()-1d',
    nameDuration: 'last 24h',
    interval: '1h',
    nameInterval: 'per hour',
    timeFormat: 'HH:mm'
})
periods.set('2-past-week', {
    id: 'past-week',
    duration: 'now()-1w',
    nameDuration: 'last 7 days',
    interval: '1d',
    nameInterval: 'per day',
    timeFormat: 'DD/MM'
})
periods.set('3-past-month', {
    id: 'past-month',
    duration: 'now()-30d',
    nameDuration: 'last 30 days ',
    interval: '1d',
    nameInterval: 'per day',
    timeFormat: 'DD/MM'
})
periods.set('4-past-3months', {
    id: 'past-3months',
    duration: 'now()-90d',
    nameDuration: 'last 3 months',
    interval: '1w',
    nameInterval: 'per week',
    timeFormat: 'DD/MM'
})
periods.set('5-past-3months', {
    id: 'past-6months',
    duration: 'now()-180d',
    nameDuration: 'last 6 months',
    interval: '1w',
    nameInterval: 'per week',
    timeFormat: 'DD/MM'
})
periods.set('6-past-year', {
    id: 'past-year',
    duration: 'now()-52w',
    nameDuration: 'last 12 months',
    interval: '1w',
    nameInterval: 'per week',
    timeFormat: 'DD/MM'
})
