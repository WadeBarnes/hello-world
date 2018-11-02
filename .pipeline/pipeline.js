'use strict';

const fs = require('fs');
const isPlainObject = require('lodash.isplainobject');
const isFunction = require('lodash.isfunction');


class Stage {
  constructor(name, options=undefined, callback=undefined){
    if (isFunction(options) || options instanceof Array) {
      callback=options
      options=undefined
    }
  
    if (name == null) throw Error("name cannot be null or undefined")
    if (name.indexOf('.')>=0) throw Error("name cannot contain dot(.)")
    this.name=name;
    this.steps=callback;
    this.options=options || {}
    this._path = name
    this.skip=false

    //console.log(`creating '${name}'`)
    if (this.steps instanceof Array){
      for (var i=0; i < this.steps.length; i++){
        var step= this.steps[i]
        step._parent=this
      }
    }
  }

  then (){
    var args = Array.prototype.slice.call(arguments, 0)
    args.unshift(null)
    var clazz = Stage;
    var object = new (Function.prototype.bind.apply(clazz, args))
  
    //constructor.apply(object, args);
    if(this !== global && this != null){
      object._root=this._root
      object._previous = this
      this._next = object
    }else{
      object._root=object
    }
    return object;
  }
  gate(){
    var args = Array.prototype.slice.call(arguments, 0)
    args.unshift(null)
    var clazz = Gate;
    var object = new (Function.prototype.bind.apply(clazz, args))
  
    //constructor.apply(object, args);
    if(this !== global && this != null){
      object._root=this._root
      object._previous = this
      this._next = object
    }else{
      object._root=object
    }
    return object;
  }
}

class Gate extends Stage {

}

class Pipeline {
  constructor(stages){
    this.stages=stages
    this.cache={}
  }
  setStageState(stage, key, value){
    var _cache= this.cache[stage._path] || {}
    _cache[key]=value
    this.cache[stage._path]= _cache
  }
  getStageState(stage, key){
    var _cache= this.cache[stage._path] || {}
    this.cache[stage._path]= _cache
    if (key ==null ) return _cache
    return _cache[key]
  }
  setStageOutput(stage, output){
    this.setStageState(stage, 'output', output)
  }
  getStageOutput(stage){
    return this.getStageState(stage, 'output')
  }
  restoreState(){
    const stateFilePath = "pipeline.state.json"
    if (fs.existsSync(stateFilePath)) {
      var stateFileContent = fs.readFileSync(stateFilePath, {encoding:'utf-8'});
      Object.assign(this.cache, JSON.parse(stateFileContent))
    }
  }
  saveState(){
    const stateFilePath = "pipeline.state.json"
    var json = JSON.stringify(this.cache, null, 2);
    fs.writeFileSync(stateFilePath, json, {encoding:'utf-8'}); 
  }
  runStage(stage){
    const pipeline = this
    var promises =[]
    if (stage.steps !=null){
      if (!(stage.steps instanceof Array)){
        if (stage._gates !=null){
          //console.log(`Gated by ${stage._gates}`)
          for (var i = 0; i < stage._gates.length; i++) {
            var result = pipeline.getStageOutput(stage._gates[i])
            //console.log(`result:${result}`)
            if (result==null || result !== true){
              stage.skip = true
              break
            }
          }
        }

        if (stage.skip === false ){
          console.log(`Scheduling ${stage.name}`)
          var previousResult = pipeline.getStageOutput(stage)
          if (previousResult !=null){
            console.log(`Reusing previous output for ${stage.name}`)
            promises.push(Promise.resolve(previousResult))
          }else{
            if (stage instanceof Gate){
              //
              if (fs.existsSync('pipeline.input.json')) {
                fs.renameSync('pipeline.input.json', `pipeline.state.${stage.name}.json`)
              }
              var input = undefined

              if (fs.existsSync(`pipeline.state.${stage.name}.json`)) {
                var inputFileContent = fs.readFileSync(`pipeline.state.${stage.name}.json`, {encoding:'utf-8'});
                input = JSON.parse(inputFileContent)
              }

              promises.push(new Promise(function(resolve, reject) {
                //state.active[stage._path] = true
                const startTime = process.hrtime()
                pipeline.setStageState(stage, 'start', startTime)
                stage.steps(input, stage, resolve, reject)
                pipeline.setStageState(stage, 'duration', process.hrtime(startTime))
                //delete state.active[stage._path]
              }).then(result=>{
                pipeline.setStageOutput(stage, result);
                pipeline.saveState()
              }).catch(()=>{
                pipeline.setStageOutput(stage, undefined);
                pipeline.saveState()
              }))
            }else{
              promises.push(new Promise(function(resolve, reject) {
                //state.active[stage._path] = true
                const startTime = process.hrtime()
                pipeline.setStageState(stage, 'start', startTime)
                stage.steps(stage, resolve, reject)
                pipeline.setStageState(stage, 'duration', process.hrtime(startTime))
                //delete state.active[stage._path]
              }).then(result=>{
                pipeline.setStageOutput(stage, result);
                pipeline.saveState()
              }))
            }
          }
        }else{
          console.log(`Skipping ${stage.name}`)
          pipeline.setStageOutput(stage, undefined);
          pipeline.saveState()
        }
      }else{
        stage.steps.forEach(subStage =>{
          var head = subStage
          //rewind to first stage in the chain
          while(head._previous != null) {
            head = head._previous
          }
          if (head.skip === false){
            promises.push(this.runStage(head))
          }
        })
      }
    }
    return Promise.all(promises).then(result => {
      if (stage._next != null){
        this.runStage(stage._next)
      }
    })
  }// end run
  async run(){
    const separator = '.'
    var _stages = new Map()
    var _last = this.stages; //tail
    var _fist = this.stages; //head

    //rewind to first stage in the chain
    while(_fist._previous != null) {
      _fist = _fist._previous
    }
    var _root = _fist

    var collect = (stage)=>{
      stage._root = _root
      if (stage._parent != null){
        stage._path = stage._parent._path + separator + stage.name
      }
      _stages.set(stage._path, stage)

      if (stage.steps instanceof Array){
        stage.steps.forEach(subStage =>{
          var head = subStage
          head._parent=stage
  
          //rewind to first stage in the chain
          while(head._previous != null) {
            head = head._previous
            head._parent=stage
          }
          collect(head)
        })
      }

      if (stage._next !=null){
        collect(stage._next)
      }

      if (stage instanceof Gate){
        var next = stage._next
        while(next!=null){
          next._gates = next._gates || []
          next._gates.push(stage)
          next = next._next
        }
      }

    }
  
    collect(_fist)

    this.restoreState()
    await this.runStage(_fist)

    //save state
    //this.saveState()
  }
}

//Stage.prototype.gate = Stage.prototype.then
const stage = Stage.prototype.then
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
