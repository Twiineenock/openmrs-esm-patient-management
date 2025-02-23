import useSWR from 'swr';
import dayjs from 'dayjs';
import uniqBy from 'lodash-es/uniqBy';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type Appointment, type AppointmentSummary } from '../types';
import { omrsDateFormat } from '../constants';
import {
  getHighestAppointmentServiceLoad,
  flattenAppointmentSummary,
  getServiceCountByAppointmentType,
} from '../helpers';
import isEmpty from 'lodash-es/isEmpty';
import SelectedDateContext from './selectedDateContext';
import { useContext } from 'react';

export const useClinicalMetrics = () => {
  const { selectedDate } = useContext(SelectedDateContext);
  const endDate = dayjs(new Date(selectedDate).setHours(23, 59, 59, 59)).format(omrsDateFormat);
  const url = `${restBaseUrl}/appointment/appointmentSummary?startDate=${selectedDate}&endDate=${endDate}`;
  const { data, error, isLoading } = useSWR<{
    data: Array<AppointmentSummary>;
  }>(url, openmrsFetch);

  const totalAppointments = getServiceCountByAppointmentType(data?.data ?? [], 'allAppointmentsCount');

  const missedAppointments = getServiceCountByAppointmentType(data?.data ?? [], 'missedAppointmentsCount');

  const transformedAppointments = flattenAppointmentSummary(data?.data ?? []);
  const highestServiceLoad = getHighestAppointmentServiceLoad(transformedAppointments);

  return {
    isLoading,
    error,
    totalAppointments,
    missedAppointments,
    highestServiceLoad,
  };
};

export function useAllAppointmentsByDate() {
  const { selectedDate } = useContext(SelectedDateContext);
  const apiUrl = `${restBaseUrl}/appointment/all?forDate=${selectedDate}`;
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: Array<Appointment> }, Error>(
    apiUrl,
    openmrsFetch,
  );

  const providersArray = data?.data?.flatMap(({ providers }) => providers ?? []) ?? [];

  const validProviders = providersArray.filter((provider) => provider.response === 'ACCEPTED');

  const uniqueProviders = uniqBy(validProviders, (provider) => provider.uuid);
  const providersCount = uniqueProviders.length;

  return {
    totalProviders: providersCount ? providersCount : 0,
    isLoading,
    error,
    isValidating,
    mutate,
  };
}

export const useScheduledAppointment = (serviceUuid: string[]) => {
  const { selectedDate } = useContext(SelectedDateContext);
  const url = `${restBaseUrl}/appointment/all?forDate=${selectedDate}`;

  const { data, error, isLoading } = useSWR<{
    data: Array<any>;
  }>(url, openmrsFetch);

  const totalScheduledAppointments = !isEmpty(serviceUuid)
    ? data?.data?.filter((appt) => serviceUuid.includes(appt?.service?.uuid))?.length ?? 0
    : data?.data?.length ?? 0;

  return {
    isLoading,
    error,
    totalScheduledAppointments,
  };
};
