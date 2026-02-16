const seatingPlanBuilder = require('../seatingPlanBuilder');

const getCodesByCandidateSequence = (rows) => {
  const seats = [];

  for (let i = 0; i < 8; i += 1) {
    seats.push({ rollNo: rows[i].row1RollNo, qpCode: rows[i].row1QpCode });
  }

  for (let i = 0; i < 8; i += 1) {
    seats.push({ rollNo: rows[i].row2RollNo, qpCode: rows[i].row2QpCode });
  }

  for (let i = 0; i < 8; i += 1) {
    seats.push({ rollNo: rows[i].row3RollNo, qpCode: rows[i].row3QpCode });
  }

  return seats.filter((seat) => Boolean(seat.rollNo)).map((seat) => seat.qpCode);
};

describe('SeatingPlanBuilder QP code sequencing', () => {
  it('assigns QP codes in 1,2,3 cycle for buildRows', () => {
    const candidates = Array.from({ length: 12 }, (_, idx) => ({
      rollNo: `R${idx + 1}`,
    }));

    const rows = seatingPlanBuilder.buildRows(candidates);
    const qpCodes = getCodesByCandidateSequence(rows);

    expect(qpCodes).toEqual(['1', '2', '3', '1', '2', '3', '1', '2', '3', '1', '2', '3']);
  });

  it('resets QP cycle per room for buildRowsWithOffset', () => {
    const candidates = Array.from({ length: 6 }, (_, idx) => ({
      rollNo: `R${idx + 1}`,
    }));

    const rows = seatingPlanBuilder.buildRowsWithOffset(candidates, 5, 0, null);
    const qpCodes = getCodesByCandidateSequence(rows);

    expect(qpCodes).toEqual(['1', '2', '3', '1', '2', '3']);
  });
});
