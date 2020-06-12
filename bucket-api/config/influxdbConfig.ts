export const influxdbConfig: any = {
    host: process.env.INFLUXDB_HOST,
    database: process.env.INFLUXDB_DB,
    // schema: [
    //   {
    //     measurement: 'response_times',
    //     fields: {
    //       path: Influx.FieldType.STRING,
    //       duration: Influx.FieldType.INTEGER
    //     },
    //     tags: [
    //       'host'
    //     ]
    //   }
    // ]
  };


