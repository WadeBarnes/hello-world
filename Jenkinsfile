pipeline {
    agent none
    stages {
        stage('Build') {
            steps {
                echo "Building ..."
                sh ".pipeline/cli.sh build --pr=${CHANGE_ID}"
            }
        }
        stage('Deploy (DEV)') {
            steps {
                echo "Deploying ..."
                sh ".pipeline/cli.sh deploy --pr=${CHANGE_ID} --env=dev"
            }
        }
    }
}