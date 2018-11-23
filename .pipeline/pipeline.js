'use strict';
const {Pipeline:Pipeline, PipelineStage:Stage, PipelineGate:Gate} = require('pipeline-cli')
const stage = Stage.create
const pipeline = function (stages){
  new Pipeline(stages).run()
}

const defaultStep=(ctx, resolve, reject) =>{
  console.log(`Running '${ctx._path}'`)
  resolve(true)
}

const defaultGate=(input, ctx, resolve, reject) =>{
  if (input!=null){
    console.log(`Running '${ctx._path}'`)
    resolve(true)
  }else{
    resolve(undefined)
  }
}

pipeline(
  new Stage("build", async (ctx, resolve, reject)=>{
    await require('./lib/build.js')()
    resolve(true)
  })
  .then("qa", defaultStep)
  .then("test", [
    stage("functional", defaultStep).then("system", defaultStep),
    stage("security", defaultStep)
  ])
  .gate('approve-to-dev', defaultGate,{
    description:'',
    parameters:[
      {id:'comment', type:'text', description:'Comment'}
    ]
  })
  .then("deploy-dev", async (ctx, resolve, reject)=>{
    await require('./lib/deploy.js')()
    resolve(true)
  })
  .gate('approve-to-test', defaultGate,{
    description:'',
    parameters:[
      {id:'comment', type:'text', description:'Comment'}
    ]
  })
  .then("deploy-test", defaultStep)
  .then("deploy-prod", defaultStep)
  .gate('final-approval', defaultGate,{
    description:'',
    parameters:[
      {id:'comment', type:'text', description:'Comment'}
    ]
  })
  .then("clean", async (ctx, resolve, reject)=>{
    await require('./lib/clean.js')()
    resolve(true)
  })
)
