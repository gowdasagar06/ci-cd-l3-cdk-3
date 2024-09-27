import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Stack, StackProps, CfnOutput, Stage, StageProps } from 'aws-cdk-lib';
import { CodePipeline, CodePipelineSource, ShellStep, CodeBuildStep } from 'aws-cdk-lib/pipelines';
import { config } from './config'; // Assuming this imports configuration values
import { MyPipelineAppStage } from './stage';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';

export class CiCdAwsPipelineDemoStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, 'Pipeline', {
      crossAccountKeys: true,
      // enableKeyRotation: true,
      pipelineName: 'TestPipeline',
      synth: new CodeBuildStep('Build', {
        input: CodePipelineSource.connection("gowdasagar06/ci-cd-l3-cdk-3", "main", {
          connectionArn: "arn:aws:codeconnections:us-east-1:264852106485:connection/f968bc8d-0b90-4fe4-8ab1-f84769fa6afb",
        }),
        commands: [
          'cp -r CDK Ohana-Springboot/',
          'mv ./Ohana-Springboot/CDK ./Ohana-Springboot/build_artifacts',
          'cd CDK',
          'ls',
          'npm ci', 'npm run build', 'npx cdk synth',
          'cp -r cdk.out/* ../Ohana-Springboot/build_artifacts/',
          'cd ..',
          'cp -r aws/infra/codepipeline/* Ohana-Springboot/',
          'cd Ohana-Springboot',
          'ls',
          'chmod +x test.sh',
          './test.sh',
          'ls -al',
          ],
        buildEnvironment: {
          buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_5,
          // buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
        },
        primaryOutputDirectory: './Ohana-Springboot/build_artifacts',
      }),
      selfMutation: false
    });

    const testingStage = pipeline.addStage(new MyPipelineAppStage(this, "test", {
      env: { account: "954503069243", region: "us-east-1" }
    }));
    // Create an IAM role for the CodeBuildStep
    const testRole = new iam.Role(this, 'TestRole-cicd', {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
      inlinePolicies: {
        AssumeRolePolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['sts:AssumeRole'],
              resources: [
                'arn:aws:iam::954503069243:role/cdk-hnb659fds-deploy-role-954503069243-us-east-1',
                'arn:aws:iam::954503069243:role/cdk-hnb659fds-file-publishing-role-954503069243-us-east-1'
              ],
            }),
            new iam.PolicyStatement({
              actions: ['ssm:GetParameter', 'ssm:GetParameters', 'ssm:GetParametersByPath'],
              resources: ['arn:aws:ssm:us-east-1:264852106485:parameter/matson-hello-world/*'],
            }),
          ],
        }),
      },
    });

    testingStage.addPost(new CodeBuildStep("Deploy Application", {
      input: pipeline.synth,
      primaryOutputDirectory: '',
      commands: [ 'ls',
                'chmod +x test2.sh',
                './test2.sh',
      ],
      buildEnvironment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_5,
      },
      env: {
        STAGE: 'lab',
        CROSS_ACCOUNT_S3_BUCKET: 'test-cross-teest-680-lab',
        CROSS_ACCOUNT_S3_BUCKET_PATH: "s3://test-cross-teest-680-lab"
      },
      role: testRole 
    }));

    // testingStage.addPre(new CodeBuildStep("Run Unit Tests", { commands: ['npm install'],
    //   role: testRole // Assign the role to the CodeBuildStep
    //  }));
    // testingStage.addPost(new ManualApprovalStep('Manual approval before production'));

    // const prodStage = pipeline.addStage(new MyPipelineAppStage(this, "prod", {
    //   env: { account: "264852106485", region: "us-east-1" }
    // }));
  }
}
