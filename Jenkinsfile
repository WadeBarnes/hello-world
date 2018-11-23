pipeline {
    agent none
    options {
        disableResume()
    }
    stages {
        stage('Build') {
            agent { label 'build' }
            steps {
                echo "Aborting all running jobs ..."
                script {
                    abortAllPreviousBuildInProgress(currentBuild)
                }
                echo "BRANCH_NAME:${env.BRANCH_NAME}\nCHANGE_ID:${env.CHANGE_ID}\nCHANGE_TARGET:${env.CHANGE_TARGET}"
                echo "Building ..."
                sh ".pipeline/pipeline-cli build --pr=${CHANGE_ID} --config=openshift/config.groovy"
            }
        }
        stage('Deploy (PROD)') {
            agent { label 'deploy' }
            input {
                message "Should we continue with deployment to PROD?"
                ok "Yes!"
            }
            steps {
                echo "Deploying ..."
                sh ".pipeline/pipeline-cli deploy --config=openshift/config.groovy --pr=${CHANGE_ID} --env=prod"
            }    
        }
    }
}