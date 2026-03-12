jest.mock('../../models/DutyAssignment', () => ({
  find: jest.fn(),
  bulkWrite: jest.fn(),
}));

jest.mock('../../models/Teacher', () => ({
  find: jest.fn(),
  bulkWrite: jest.fn(),
}));

jest.mock('../../models/Room', () => ({
  find: jest.fn(),
}));

jest.mock('../../models/SeatingPlanAllocation', () => ({
  find: jest.fn(),
}));

jest.mock('../../models/Candidate', () => ({
  find: jest.fn(),
}));

jest.mock('../../models/DutySelection', () => ({
  find: jest.fn(),
}));

jest.mock('../../models/DutyAllocationSetting', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../models/SeatingPlanTemplateSetting', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../utils/pdfGenerator', () => ({}));

const DutyAssignment = require('../../models/DutyAssignment');
const Teacher = require('../../models/Teacher');
const Room = require('../../models/Room');
const SeatingPlanAllocation = require('../../models/SeatingPlanAllocation');
const DutyAllocationSetting = require('../../models/DutyAllocationSetting');
const { assignDailyDuties } = require('../dutiesController');

const flush = () => new Promise((resolve) => setImmediate(resolve));

const makeQuery = (result) => {
  const query = {
    select: jest.fn(() => query),
    populate: jest.fn(() => query),
    sort: jest.fn(() => query),
    lean: jest.fn().mockResolvedValue(result),
  };
  return query;
};

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('dutiesController.assignDailyDuties', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    DutyAllocationSetting.findOne.mockReturnValue({
      sort: jest.fn(() => ({
        lean: jest.fn().mockResolvedValue({ mode: 'manual' }),
      })),
    });
  });

  it('rejects non-current-invigilator functionaries', async () => {
    Room.find.mockReturnValueOnce(makeQuery([
      { _id: 'room-1', roomNo: '1', allocationOrderByDate: {} },
    ]));

    Teacher.find.mockReturnValueOnce(makeQuery([
      {
        _id: 'fn-inv-1',
        name: 'Invigilator One',
        employeeId: '1001',
        dutyType: 'Invigilator',
        isActive: true,
        schoolCode: 'SCH1',
        subjectCode: '',
        supervisionHistory: [],
      },
      {
        _id: 'fn-clerk-1',
        name: 'Clerk One',
        employeeId: '1002',
        dutyType: 'Clerk',
        isActive: true,
        schoolCode: 'SCH2',
        subjectCode: '',
        supervisionHistory: [],
      },
    ]));

    const req = {
      body: {
        examDate: '2026-03-16',
        functionaryIds: ['fn-clerk-1'],
        secondFunctionaryIds: ['fn-inv-1'],
      },
    };
    const res = createRes();
    const next = jest.fn();

    assignDailyDuties(req, res, next);
    await flush();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Only active current invigilators can be assigned to room duties.',
      invalidFunctionaries: [
        expect.objectContaining({
          _id: 'fn-clerk-1',
          dutyType: 'Clerk',
        }),
      ],
    }));
    expect(DutyAssignment.bulkWrite).not.toHaveBeenCalled();
  });

  it('accepts valid current invigilators for manual assignment', async () => {
    Room.find.mockReturnValueOnce(makeQuery([
      { _id: 'room-1', roomNo: '1', allocationOrderByDate: {} },
    ]));

    Teacher.find.mockReturnValueOnce(makeQuery([
      {
        _id: 'fn-inv-1',
        name: 'Invigilator One',
        employeeId: '1001',
        dutyType: 'Invigilator',
        isActive: true,
        schoolCode: 'SCH1',
        subjectCode: '',
        supervisionHistory: [],
      },
      {
        _id: 'fn-inv-2',
        name: 'Invigilator Two',
        employeeId: '1002',
        dutyType: 'Invigilator',
        isActive: true,
        schoolCode: 'SCH2',
        subjectCode: '',
        supervisionHistory: [],
      },
    ]));

    SeatingPlanAllocation.find
      .mockReturnValueOnce(makeQuery([]))
      .mockReturnValueOnce(makeQuery([]))
      .mockReturnValueOnce(makeQuery([]));

    DutyAssignment.bulkWrite.mockResolvedValueOnce(undefined);
    Teacher.bulkWrite.mockResolvedValueOnce(undefined);
    DutyAssignment.find.mockReturnValueOnce(makeQuery([
      {
        room: { _id: 'room-1', roomNo: '1', allocationOrderByDate: {} },
        functionary: { _id: 'fn-inv-1', name: 'Invigilator One', employeeId: '1001' },
        functionary2: { _id: 'fn-inv-2', name: 'Invigilator Two', employeeId: '1002' },
      },
    ]));

    const req = {
      body: {
        examDate: '2026-03-16',
        functionaryIds: ['fn-inv-1'],
        secondFunctionaryIds: ['fn-inv-2'],
      },
      user: { _id: 'user-1' },
    };
    const res = createRes();
    const next = jest.fn();

    assignDailyDuties(req, res, next);
    await flush();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(DutyAssignment.bulkWrite).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        totalAssigned: 1,
        totalRooms: 1,
      }),
    }));
  });
});
