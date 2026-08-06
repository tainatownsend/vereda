import {run} from './production_readiness_cli.mjs';run('evaluate').catch(e=>{console.error('REFUSED:',e.message);process.exitCode=1})
