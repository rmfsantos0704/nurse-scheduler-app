import axios from "axios";

const API_URL = "http://192.168.1.49:5000/api";

// GET schedules by date
export const getSchedulesByDate = async (date: string) => {
  const res = await axios.get(`${API_URL}/schedules/${date}`);
  return res.data;
};

// CREATE schedule
export const createSchedule = async (data: any) => {
  const res = await axios.post(`${API_URL}/schedules`, data);
  return res.data;
};