import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { InventoryItem, MovementRecord, Student } from '../types.ts';
import { supabase } from '../supabaseClient.ts';
import { 
  fetchInitialData, 
  checkoutInstrument, 
  returnInstrument, 
  clearInventoryDatabase, 
  clearHistoryDatabase, 
  syncExcelData
} from '../services/supabaseService.ts';
import { processExcelFile, ExcelParseResult } from '../services/excelService.ts';

interface CacheData {
  inventory: InventoryItem[];
  history: MovementRecord[];
  students: Student[];
}

export const useInventoryData = () => {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("PROCESANDO...");
  const isDeletingRef = useRef(false);

  const { data: initialData, isLoading } = useQuery<CacheData, Error>({
    queryKey: ['inventoryData'],
    queryFn: fetchInitialData,
    staleTime: Infinity, 
  });

  const data = initialData?.inventory || [];
  const history = initialData?.history || [];
  const students = initialData?.students || [];

  const invalidateData = useCallback(() => {
    if (!isDeletingRef.current) {
      queryClient.invalidateQueries({ queryKey: ['inventoryData'] });
    }
  }, [queryClient]);

  useEffect(() => {
    const inventoryChannel = supabase.channel('realtime:inventory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, invalidateData)
      .subscribe();

    const historyChannel = supabase.channel('realtime:history')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'history' }, invalidateData)
      .subscribe();

    const studentsChannel = supabase.channel('realtime:students')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, invalidateData)
      .subscribe();

    return () => {
      supabase.removeChannel(inventoryChannel);
      supabase.removeChannel(historyChannel);
      supabase.removeChannel(studentsChannel);
    };
  }, [invalidateData]);

  const excelMutation = useMutation<void, Error, InventoryItem[]>({
    mutationFn: async (mappedData) => {
      isDeletingRef.current = true;
      await syncExcelData(mappedData, setProcessingMessage);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryData'] });
      alert("Inventario actualizado exitosamente.");
    },
    onSettled: () => {
      isDeletingRef.current = false;
      setIsProcessing(false);
      setProcessingMessage("PROCESANDO...");
    }
  });

  const handleExcelUpload = async (file: File, onSuccess: () => void) => {
    setIsProcessing(true);
    setProcessingMessage("Procesando Excel...");
    try {
      const result: ExcelParseResult = await processExcelFile(file);
      
      if (!result.success || !result.data) {
        setIsProcessing(false);
        const errorList = result.errors ? result.errors.join('\n') : 'Datos inválidos';
        alert(`Se encontraron errores en el Excel:\n\n${errorList}`);
        return;
      }

      const mappedData = result.data;
      
      queryClient.setQueryData<CacheData | undefined>(['inventoryData'], (old) => {
        if (!old) return old;
        return { ...old, inventory: mappedData };
      });
      onSuccess();
      excelMutation.mutate(mappedData);
    } catch (error: unknown) {
      setIsProcessing(false);
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("Error desconocido al leer el archivo.");
      }
    }
  };

  interface CheckoutVariables {
    id: string | number;
    studentName: string;
    curso: string;
    fecha: string;
    timeStr: string;
  }

  const checkoutMutation = useMutation<unknown, Error, CheckoutVariables, { previousData: CacheData | undefined }>({
    mutationFn: async ({ id, studentName, curso, fecha, timeStr }) => {
      return await checkoutInstrument(id, studentName, curso, fecha, timeStr);
    },
    onMutate: async ({ id, studentName, curso, fecha, timeStr }) => {
      await queryClient.cancelQueries({ queryKey: ['inventoryData'] });
      const previousData = queryClient.getQueryData<CacheData>(['inventoryData']);

      queryClient.setQueryData<CacheData | undefined>(['inventoryData'], (old) => {
        if (!old) return old;
        const newInventory = old.inventory.map((item) => 
          item.id.toString() === id.toString() 
            ? { ...item, Estudiante: studentName, Curso: curso, Prestado: 'SÍ', Ubicacion: 'HOGAR', FechaSalida: fecha, HoraSalida: timeStr, FechaRetorno: '' } 
            : item
        );
        return { ...old, inventory: newInventory };
      });
      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['inventoryData'], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryData'] });
    }
  });

  const performCheckout = async (id: string | number, studentName: string, curso: string, fecha: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return await checkoutMutation.mutateAsync({ id, studentName, curso, fecha, timeStr });
  };

  interface ReturnVariables {
    id: string | number;
    fecha: string;
    historyId?: string;
  }

  const returnMutation = useMutation<unknown, Error, ReturnVariables, { previousData: CacheData | undefined }>({
    mutationFn: async ({ id, fecha, historyId }) => {
      return await returnInstrument(id, fecha, historyId);
    },
    onMutate: async ({ id, fecha }) => {
      await queryClient.cancelQueries({ queryKey: ['inventoryData'] });
      const previousData = queryClient.getQueryData<CacheData>(['inventoryData']);

      queryClient.setQueryData<CacheData | undefined>(['inventoryData'], (old) => {
        if (!old) return old;
        const newInventory = old.inventory.map((item) => 
          item.id.toString() === id.toString() 
            ? { ...item, Prestado: 'NO', Ubicacion: 'SALA DE MÚSICA', FechaRetorno: fecha, Estudiante: '', Curso: '' } 
            : item
        );
        return { ...old, inventory: newInventory };
      });
      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['inventoryData'], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryData'] });
    }
  });

  const performReturn = async (id: string | number, fecha: string) => {
    const historyRecord = history.find(rec => rec.instrumentId.toString() === id.toString() && rec.status === 'en_prestamo');
    return await returnMutation.mutateAsync({ id, fecha, historyId: historyRecord?.id });
  };

  const clearDatabaseMutation = useMutation<void, Error, { onSuccess: () => void }>({
    mutationFn: clearInventoryDatabase,
    onSuccess: (_, variables) => {
      setProcessingMessage("¡Limpieza completada!");
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['inventoryData'] });
        variables.onSuccess();
      }, 1000);
    },
    onSettled: () => {
      isDeletingRef.current = false;
      setIsProcessing(false);
      setProcessingMessage("PROCESANDO...");
    }
  });

  const clearDatabase = async (onSuccess: () => void) => {
    isDeletingRef.current = true;
    setIsProcessing(true);
    setProcessingMessage("Borrando inventario...");
    clearDatabaseMutation.mutate({ onSuccess });
  };

  const clearHistoryMutation = useMutation<void, Error, void>({
    mutationFn: clearHistoryDatabase,
    onSuccess: () => {
      setProcessingMessage("¡Limpieza completada!");
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['inventoryData'] });
      }, 1000);
    },
    onSettled: () => {
      setIsProcessing(false);
      setProcessingMessage("PROCESANDO...");
    }
  });

  const clearHistory = async () => {
    setIsProcessing(true);
    setProcessingMessage("Eliminando registros históricos...");
    clearHistoryMutation.mutate();
  };

  return {
    data,
    history,
    students,
    isProcessing,
    processingMessage,
    handleExcelUpload,
    performCheckout,
    performReturn,
    clearDatabase,
    clearHistory,
    isLoading
  };
};
