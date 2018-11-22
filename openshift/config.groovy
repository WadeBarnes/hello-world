app {
    name = "${opt.'name'?:'hello'}"
    namespaces { //can't call environments :(
        'build'{
            namespace = 'devex-bcgov-dap-tools'
            disposable = true
        }
        'dev' {
            namespace = 'devex-bcgov-dap-tools'
            disposable = true
        }
        'prod' {
            namespace = 'devex-bcgov-dap-tools'
            disposable = false
        }
    }

    git {
        workDir = ['git', 'rev-parse', '--show-toplevel'].execute().text.trim()
        uri = ['git', 'config', '--get', 'remote.origin.url'].execute().text.trim()
        ref = "refs/pull/${opt.'pr'}/head"
    }

    build {
        env {
            name = "build"
            id = "pr-${opt.'pr'}"
        }
        suffix = "-build-${opt.'pr'}"
        id = "${app.name}${app.build.suffix}"
        version = "${app.build.env.name}-v${opt.'pr'}"
        name = "${opt.'build-name'?:app.name}"

        namespace = app.namespaces.'build'.namespace
        timeoutInSeconds = 60*20 // 20 minutes
        templates = [
                [
                    'file':'openshift/_python36.bc.json',
                    'params':[
                        'NAME': app.build.name,
                        'SUFFIX': app.build.suffix,
                        'VERSION': app.build.version,
                        'SOURCE_REPOSITORY_URL': "${app.git.uri}",
                        'SOURCE_REPOSITORY_REF': "${app.git.ref}",
                        'SOURCE_BASE_CONTEXT_DIR':'app-base',
                        'SOURCE_CONTEXT_DIR':'app'
                    ]
                ]
        ]
    }

    deployment {
        env {
            name = vars.deployment.env.name // env-name
            id = vars.deployment.env.id
        }
        suffix = "${vars.deployment.suffix}" // app (unique name across all deployments int he namespace)
        version = "${vars.deployment.version}" //app-version  and tag
        name = "${vars.deployment.name}"
        id = "${app.deployment.name}${app.deployment.suffix}" // app (unique name across all deployments int he namespace)

        namespace = "${vars.deployment.namespace}"
        timeoutInSeconds = 60*20 // 20 minutes

        templates = [
                [
                    'file':'openshift/_python36.dc.json',
                    'params':[
                        'NAME': app.deployment.name,
                        'SUFFIX': app.deployment.suffix,
                        'VERSION': app.deployment.version
                    ]
                ]
        ]
    }
}

environments {
    'dev' {
        vars {
            deployment {
                env {
                    name ="dev"
                    id = "pr-${opt.'pr'}"
                }
                suffix = "-dev-${opt.'pr'}"
                name = "${opt.'deployment-name'?:app.name}"
                namespace = app.namespaces[env.name].namespace
                version = "${vars.deployment.name}-${vars.deployment.env.name}-v${opt.'pr'}" //app-version  and tag
            }
        }
    }
    'prod' {
        vars {
            deployment {
                env {
                    name ="prod"
                    id = "pr-${opt.'pr'}"
                }
                suffix = '-prod'
                id = "${app.name}${vars.deployment.suffix}"
                name = "${opt.'deployment-name'?:app.name}"
                namespace = app.namespaces[env.name].namespace
                version = "v2-latest" //app-version  and tag
            }
        }
    }
}