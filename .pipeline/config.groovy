app {
    name = 'myapp'
    namespaces { //can't call environments :(
        'build'{
            namespace = System.getenv("NAMESPACE_BUILD")?:'devex-bcgov-dap-tools'
            disposable = true
        }
        'dev' {
            namespace = System.getenv("NAMESPACE_DEV")?:'devex-bcgov-dap-tools'
            disposable = true
        }
        'test' {
            namespace = System.getenv("NAMESPACE_TEST")?:'devex-bcgov-dap-tools'
            disposable = false
        }
        'prod' {
            namespace = System.getenv("NAMESPACE_PROD")?:'devex-bcgov-dap-tools'
            disposable = false
        }
    }

    git {
        workDir = ['git', 'rev-parse', '--show-toplevel'].execute().text.trim()
        uri = ['git', 'config', '--get', 'remote.origin.url'].execute().text.trim()
        commit = ['git', 'rev-parse', 'HEAD'].execute().text.trim()
        ref = opt.'branch'?:['bash','-c', 'git config branch.`git name-rev --name-only HEAD`.merge'].execute().text.trim()
        changeId = "${opt.'pr'}"
        ref = opt.'branch'?:"refs/pull/${git.changeId}/head"
        github {
            owner = app.git.uri.tokenize('/')[2]
            name = app.git.uri.tokenize('/')[3].tokenize('.git')[0]
        }
    }

    build {
        env {
            name = 'build'
            id = "pr-${app.git.changeId}"
        }
        id = "${app.name}-${app.build.env.name}-${app.build.env.id}"
        name = "${app.name}"
        version = "${app.build.env.name}-${app.build.env.id}"

        suffix = "-${app.git.changeId}"
        namespace = app.namespaces.build.namespace
        timeoutInSeconds = 60*20 // 20 minutes
        templates = [
            [
                'file':'.pipeline/_python36.bc.json',
                'params':[
                        'NAME':"${app.name}",
                        'SUFFIX': "${app.build.suffix}",
                        'VERSION':"${app.build.version}",
                        'SOURCE_BASE_CONTEXT_DIR': "example/backend/app-base",
                        'SOURCE_CONTEXT_DIR': "example/backend/app",
                        'SOURCE_REPOSITORY_URL': "${app.git.uri}"
                ]
            ]
        ]
    }

    deployment {
        env {
            name = vars.deployment.env.name // env-name
            id = "pr-${app.git.changeId}"
        }

        id = "${app.name}-${app.deployment.env.name}-${app.deployment.env.id}"
        name = "${app.name}"
        version = "${app.deployment.env.name}-${app.deployment.env.id}"

        suffix = "-pr-${app.git.changeId}"
        namespace = "${vars.deployment.namespace}"
        timeoutInSeconds = 60*20 // 20 minutes
        templates = [
            [
                'file':'.pipeline/_python36.dc.json',
                'params':[
                        'NAME':"${app.name}",
                        'SUFFIX': "${app.deployment.suffix}",
                        'VERSION':"${app.deployment.version}",
                        'HOST': "${vars.modules.'backend'.HOST}"
                ]
            ]
        ]
    }
}

//Default Values (Should it default to DEV or PROD???)
vars {
    modules {
        'backend' {
            HOST = ""
        }
    }
}

environments {
    'dev' {
        vars {
            DB_PVC_SIZE = '1Gi'
            git {
                changeId = "${opt.'pr'}"
            }
            deployment {
                env {
                    name = "dev"
                }
                key = 'dev'
                namespace = app.namespaces.dev.namespace
            }
            modules {
                'backend' {
                    HOST = "myapp-${vars.git.changeId}-${vars.deployment.namespace}.pathfinder.gov.bc.ca"
                }
            }
        }
    }
    'test' {
        vars {
            deployment {
                key = 'test'
                namespace = app.namespaces.test.namespace
            }
        }
    }
    'prod' {
        vars {
            deployment {
                key = 'prod'
                namespace = app.namespaces.prod.namespace
            }
        }
    }
}