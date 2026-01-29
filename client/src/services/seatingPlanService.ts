import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface Room {
  _id: string;
  roomNo: string;
  roomName?: string;
  floor?: string;
  capacity: number;
  isActive: boolean;
}

export const seatingPlanService = {
  // Room management
  async getRooms(): Promise<Room[]> {
    const response = await axios.get(`${API_URL}/seating-plan/rooms`);
    return response.data;
  },

  async createRoom(roomData: Partial<Room>): Promise<Room> {
    const response = await axios.post(`${API_URL}/seating-plan/rooms`, roomData);
    return response.data;
  },

  async updateRoom(id: string, roomData: Partial<Room>): Promise<Room> {
    const response = await axios.put(`${API_URL}/seating-plan/rooms/${id}`, roomData);
    return response.data;
  },

  async deleteRoom(id: string): Promise<void> {
    await axios.delete(`${API_URL}/seating-plan/rooms/${id}`);
  },

  // PDF generation
  async generateMainGate(datesheetId: string): Promise<Blob> {
    const response = await axios.get(
      `${API_URL}/seating-plan/generate/main-gate/${datesheetId}`,
      { responseType: 'blob' }
    );
    return response.data;
  },

  async generateRoomFolderSlip(datesheetId: string): Promise<Blob> {
    const response = await axios.get(
      `${API_URL}/seating-plan/generate/room-folder-slip/${datesheetId}`,
      { responseType: 'blob' }
    );
    return response.data;
  },

  async generateRoomDoorSlip(datesheetId: string): Promise<Blob> {
    const response = await axios.get(
      `${API_URL}/seating-plan/generate/room-door-slip/${datesheetId}`,
      { responseType: 'blob' }
    );
    return response.data;
  },

  async generateCBSECopy(datesheetId: string): Promise<Blob> {
    const response = await axios.get(
      `${API_URL}/seating-plan/generate/cbse-copy/${datesheetId}`,
      { responseType: 'blob' }
    );
    return response.data;
  },

  // Helper to download PDF
  downloadPDF(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};
