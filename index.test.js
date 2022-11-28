const run = require('.');
const core = require('@actions/core');
const fs = require('fs');

jest.mock('@actions/core');
jest.mock('fs', () => ({
    mkdirSync: () => true,
    existsSync: () => true,
    appendFileSync: () => true,
    promises: {
        access: jest.fn()
    }
}));

const mockBatchRegisterJobDef = jest.fn();
jest.mock('aws-sdk', () => {
    return {
        config: {
            region: 'fake-region'
        },
        Batch: jest.fn(() => ({
            registerJobDefinition: mockBatchRegisterJobDef,
        })),
    };
});


describe('Deploy to ECS', () => {

    beforeEach(() => {
        jest.clearAllMocks();

        core.getInput = jest
            .fn()
            .mockReturnValueOnce('job-definition.json'); // job-definition

        process.env = Object.assign(process.env, { GITHUB_WORKSPACE: __dirname });

        fs.existsSync.mockReturnValue(true);

        jest.mock('./job-definition.json', () => ({
            type: 'container',
            containerProperties: {
                image: "some-other-image"
            }
        }),
            { virtual: true });

        mockBatchRegisterJobDef.mockImplementation(() => {
            return {
                promise() {
                    return Promise.resolve({
                        jobDefinitionArn: 'job:def:arn',
                        jobDefinitionName: 'job',
                        revision: 1,
                    }
                    );
                }
            };
        });
    });

    test('registers the job definition contents', async () => {
        await run();
        expect(core.setFailed).toHaveBeenCalledTimes(0);
        expect(mockBatchRegisterJobDef).toHaveBeenNthCalledWith(1, {
            type: 'container',
            containerProperties: {
                image: "some-other-image"
            }
        });
        expect(core.setOutput).toHaveBeenNthCalledWith(1, 'job-definition-arn', 'job:def:arn');
        expect(core.setOutput).toHaveBeenNthCalledWith(2, 'job-definition-name', 'job');
        expect(core.setOutput).toHaveBeenNthCalledWith(3, 'revision', 1);
    });
})