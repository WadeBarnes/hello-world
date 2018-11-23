'use strict';
const {OpenShiftClientX} = require('pipeline-cli')

module.exports = (settings)=>{
  const oc=new OpenShiftClientX({'namespace':'devex-bcgov-dap-tools'});
  
  //return Promise.all([
  oc.raw('delete', ['all'], {selector:'app-name=hello,env-id=1,env-name!=prod', namespace:'devex-bcgov-dap-tools'})
  oc.raw('delete', ['all'], {selector:'app-name=hello,env-id=1,env-name!=prod', namespace:'devex-bcgov-dap-tools'})
  //])
}