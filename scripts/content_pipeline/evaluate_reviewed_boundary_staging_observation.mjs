import {run} from './production_readiness_cli.mjs';run('observe').catch(e=>{console.error('REFUSED:',e.message);process.exitCode=1})
