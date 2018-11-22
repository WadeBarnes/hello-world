
app {
    name = 'jenkins-cvarjao'
    namespaces {
        'build'{
            namespace = 'devex-bcgov-dap-tools'
            disposable = true
        }
        'dev' {
            namespace = app.namespaces.'build'.namespace
            disposable = true
        }
        'prod' {
            namespace = app.namespaces.'build'.namespace
            disposable = false
        }
    }

    git {
        workDir = ['git', 'rev-parse', '--show-toplevel'].execute().text.trim()
        uri = ['git', 'config', '--get', 'remote.origin.url'].execute().text.trim()
        ref = ['bash','-c', 'git config branch.`git name-rev --name-only HEAD`.merge'].execute().text.trim()
        commit = ['git', 'rev-parse', 'HEAD'].execute().text.trim()
    }

    build {
        env {
            name = "build"
            id = "pr-${opt.'pr'}"
        }
        version = "${app.build.env.name}-v${opt.'pr'}"
        name = "${opt.'build-name'?:app.name}"
        suffix = "-build-${opt.'pr'}"
        id = "${app.name}${app.build.suffix}"
        namespace = app.namespaces.'build'.namespace
        timeoutInSeconds = 60*20 // 20 minutes
        templates = [
            [
                'file':'https://raw.githubusercontent.com/cvarjao-o/openshift-templates/f1d3e44018618ef7c9b9b52dd81d83d7030115db/jenkins/jenkins.bc.yaml',
                'params':[
                    'NAME': "${app.build.name}",
                    'SUFFIX': "${app.build.suffix}",
                    'VERSION': app.build.version
                ]
            ]
        ]
    }

    deployment {
        env {
            name = vars.deployment.env.name // env-name
            id = vars.deployment.env.id
        }
        id = "${app.name}" // app (unique name across all deployments int he namespace)
        version = "v1" //app-version  and tag
        name = "${app.name}" //app-name   (same name accross all deployments)

        namespace = "${vars.deployment.namespace}"
        timeoutInSeconds = 60*20 // 20 minutes
        templates = [
                [
                    'file':'https://raw.githubusercontent.com/cvarjao-o/openshift-templates/f1d3e44018618ef7c9b9b52dd81d83d7030115db/jenkins/jenkins.dc.yaml',
                    'params':[
                        'NAME':app.deployment.name,
                        'BC_NAME':app.build.name,
                        'NAME_SUFFIX':'cvarjao',
                        'VERSION': app.deployment.version,
                        'ROUTE_HOST': 'jenkinns-hello-cvarjao.pathfinder.gov.bc.ca'
                    ]
                ]
        ]
    }
}

vars {
    deployment {
        env {
            name ="prod"
            id = "pr-${opt.'pr'}"
        }
        suffix = ''
        name = "${opt.'deployment-name'?:app.name}"
        namespace = app.namespaces[env.name].namespace
        version = "${vars.deployment.name}-${vars.deployment.env.name}-${opt.'pr'}" //app-version  and tag
    }
}
