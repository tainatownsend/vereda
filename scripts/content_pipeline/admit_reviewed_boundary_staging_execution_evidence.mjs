import {run} from './production_readiness_cli.mjs';run('admit').catch(e=>{console.error('REFUSED:',e.message);process.exitCode=1})
