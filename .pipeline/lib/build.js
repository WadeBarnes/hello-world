'use strict';
const {OpenShiftClient, OpenShiftClientX} = require('pipeline-cli')
const path = require('path');


module.exports = (settings)=>{
  const oc=new OpenShiftClientX({'namespace':'devex-bcgov-dap-tools'});
  var templateFile = path.resolve(__dirname, '../../openshift/_python36.bc.json')

  var objects = oc.process(oc.toFileUrl(templateFile), {
    'param':{
      'NAME':'hello',
      'SUFFIX':'-prod',
      'VERSION':'1.0.0',
      'SOURCE_BASE_CONTEXT_DIR':'app-base',
      'SOURCE_CONTEXT_DIR':'app',
      'SOURCE_REPOSITORY_URL':`${oc.git.uri}`,
      'SOURCE_REPOSITORY_REF':`${oc.git.branch_ref}`
    }
  })

  oc.applyBestPractices(objects)
  oc.applyRecommendedLabels(objects, 'hello', 'dev', '1')
  oc.fetchSecretsAndConfigMaps(objects)
  var applyResult = oc.apply(objects)
  applyResult.narrow('bc').startBuild()
}