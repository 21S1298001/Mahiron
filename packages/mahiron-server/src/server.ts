/*
   Copyright 2016 kanreisa
   Copyright 2023 21S1298001

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
Buffer.poolSize = 0 // disable memory pool

import dotenv from 'dotenv'
dotenv.config()

import { createHash } from 'crypto'

process.title = 'Mirakurun: Server'

process.on('uncaughtException', (err) => {
  ++status.errorCount.uncaughtException
  console.error(err.stack)
})
process.on('unhandledRejection', (err) => {
  ++status.errorCount.unhandledRejection
  console.error(err)
})

setEnv('SERVER_CONFIG_PATH', '/usr/local/etc/mirakurun/server.yml')
setEnv('TUNERS_CONFIG_PATH', '/usr/local/etc/mirakurun/tuners.yml')
setEnv('CHANNELS_CONFIG_PATH', '/usr/local/etc/mirakurun/channels.yml')
setEnv('SERVICES_DB_PATH', '/usr/local/var/db/mirakurun/services.json')
setEnv('PROGRAMS_DB_PATH', '/usr/local/var/db/mirakurun/programs.json')
setEnv('LOGO_DATA_DIR_PATH', '/usr/local/var/db/mirakurun/logo-data')

import Channel from './Mirakurun/Channel'
import * as config from './Mirakurun/config'
import Event from './Mirakurun/Event'
import * as log from './Mirakurun/log'
import Program from './Mirakurun/Program'
import Server from './Mirakurun/Server'
import Service from './Mirakurun/Service'
import status from './Mirakurun/status'
import Tuner from './Mirakurun/Tuner'
import _ from './Mirakurun/_'

_.config.server = config.loadServer()
_.config.channels = config.loadChannels()
_.configIntegrity.channels = createHash('sha256')
  .update(JSON.stringify(_.config.channels))
  .digest('base64')
_.config.tuners = config.loadTuners()

if (typeof _.config.server.logLevel === 'number') {
  ;(<any>log).logLevel = _.config.server.logLevel
}
if (typeof _.config.server.maxLogHistory === 'number') {
  ;(<any>log).maxLogHistory = _.config.server.maxLogHistory
}

_.event = new Event()
_.tuner = new Tuner()
_.channel = new Channel()
_.service = new Service()
_.program = new Program()
_.server = new Server()

if (process.env.SETUP === 'true') {
  log.info('setup is done.')
  process.exit(0)
}

_.server.init()

function setEnv(name: string, value: string) {
  process.env[name] = process.env[name] || value
}