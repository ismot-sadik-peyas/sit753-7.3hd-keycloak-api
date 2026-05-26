pipeline {
    agent any

    environment {
        SONAR_TOKEN = credentials('sonar-token')
    }

    stages {

        stage('Build') {
            steps {
                bat 'npm install'
            }
        }

        stage('Test') {
            steps {
                bat 'npm test'
            }
        }

        stage('Code Quality') {
            steps {
                bat '''
                curl -L -o sonar.zip https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-5.0.1.3006-windows.zip
                powershell -Command "Expand-Archive sonar.zip -DestinationPath . -Force"
                sonar-scanner-5.0.1.3006-windows\\bin\\sonar-scanner.bat -Dsonar.login=%SONAR_TOKEN%
                '''
            }
        }

        stage('Security Scan') {
            steps {
                bat 'npm audit --audit-level=moderate || exit 0'
            }
        }

        stage('Deploy to Test') {
            steps {
                bat 'docker build -t keycloak-api:test .'
                bat 'docker rm -f keycloak-test || exit 0'
                bat 'docker run -d --name keycloak-test -p 3001:3030 keycloak-api:test'
            }
        }

        stage('Release to Production') {
            steps {
                bat 'docker rm -f keycloak-prod || exit 0'
                bat 'docker tag keycloak-api:test keycloak-api:prod'
                bat 'docker run -d --name keycloak-prod -p 3000:3030 keycloak-api:prod'
            }
        }

        stage('Monitoring') {
            steps {
                bat 'curl -f http://localhost:3000/health'
            }
        }
    }
}

