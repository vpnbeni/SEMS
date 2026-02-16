const { compareRoomNo } = require('../roomSort');

describe('roomSort utility', () => {
  it('sorts numeric room numbers in natural numeric order', () => {
    const rooms = [
      { roomNo: '1' },
      { roomNo: '10' },
      { roomNo: '11' },
      { roomNo: '2' },
    ];

    rooms.sort(compareRoomNo);

    expect(rooms.map((room) => room.roomNo)).toEqual(['1', '2', '10', '11']);
  });

  it('keeps leading-numeric room labels in numeric-first order', () => {
    const rooms = [
      { roomNo: '2B' },
      { roomNo: '12A' },
      { roomNo: '2A' },
      { roomNo: '10' },
      { roomNo: '1' },
    ];

    rooms.sort(compareRoomNo);

    expect(rooms.map((room) => room.roomNo)).toEqual(['1', '2A', '2B', '10', '12A']);
  });
});
