
import { PrinterDevice } from '../types';

// Mock simulation of Web Bluetooth / Network Printer discovery
export const searchForPrinters = async (): Promise<PrinterDevice[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 'p1', name: 'Star Micronics TSP100', type: 'bluetooth', status: 'disconnected' },
        { id: 'p2', name: 'Sunmi Internal Printer', type: 'network', status: 'disconnected', ipAddress: '127.0.0.1', port: '9100' },
        { id: 'p3', name: 'Generic POS Printer', type: 'bluetooth', status: 'disconnected' },
      ]);
    }, 1500); // Simulate scanning delay
  });
};

export const connectToPrinter = async (printerId: string): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Connected to printer ${printerId}`);
      resolve(true);
    }, 500);
  });
};

export const connectToNetworkPrinter = async (ip: string, port: string): Promise<PrinterDevice> => {
  if (ip === '127.0.0.1' || ip === 'localhost') {
    return {
        id: `net_${ip}_${port}`,
        name: 'Sunmi / Local Printer',
        type: 'network',
        status: 'connected',
        ipAddress: ip,
        port: port
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    await fetch(`http://${ip}:${port}/`, { 
        method: 'GET',
        signal: controller.signal,
        mode: 'no-cors' 
    });
    
    clearTimeout(timeoutId);
    
    return {
        id: `net_${ip}_${port}`,
        name: `Network Printer (${ip})`,
        type: 'network',
        status: 'connected',
        ipAddress: ip,
        port: port
    };
  } catch (e) {
    console.error("Printer connection check failed:", e);
    return {
        id: `net_${ip}_${port}`,
        name: `Network Printer (${ip})`,
        type: 'network',
        status: 'connected',
        ipAddress: ip,
        port: port
    };
  }
};

export const openCashDrawer = async (printer: PrinterDevice) => {
  const ESC_KICK = '\x1B\x70\x00\x19\xFA'; // ESC p 0 25 250
  
  if (printer.type === 'network' && printer.ipAddress) {
    return printReceiptData(printer, ESC_KICK);
  } else {
    console.log(`🖨️ SENDING BLUETOOTH COMMAND TO ${printer.name}: ESC p 0 50 250`);
  }
  return true;
};

// Helper to send data via RawBT Android Intent (Bypasses Browser Security)
const sendRawbtIntent = (data: string) => {
    try {
        // 1. Handle Currency (Swap £ for PC850 pound symbol \x9c)
        let processedData = data.replace(/£/g, '\x9c');

        // Add explicit cut commands if not present
        if (!processedData.includes('\x1d\x56')) {
            processedData += '\n\n\n\n\x1d\x56\x42\x00'; // GS V B 0 (Partial cut)
        }

        // 2. Ensure Binary Safety for btoa (Latin1 Only)
        // JavaScript strings are UTF-16. btoa expects each char to be 0-255.
        // We map any char > 255 to '?' to prevent btoa error.
        // This preserves ESC/POS bytes like \xFA (250) which are needed for drawer kick.
        const binaryString = Array.from(processedData, (char) => 
            char.charCodeAt(0) > 255 ? '?' : char
        ).join('');

        const base64 = btoa(binaryString);
        
        // 3. Construct the Intent URL
        // Removed B.silent=true to allow the RawBT modal to show, which helps with timeouts
        const intentUrl = `intent:base64,${base64}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;S.jobName=HungrySharkReceipt;end;`;
        
        // 4. Trigger via window.location
        window.location.href = intentUrl;

        return true;
    } catch (err) {
        console.error("RawBT Intent failed", err);
        return false;
    }
};

export const printReceiptData = async (printer: PrinterDevice, data: string) => {
  console.log(`🖨️ PRINTING TO ${printer.name}...`);
  
  if (printer.type === 'network' && printer.ipAddress) {
     const isLocalhost = printer.ipAddress === '127.0.0.1' || printer.ipAddress === 'localhost';

     if (isLocalhost) {
         // Direct Intent for Localhost/Sunmi
         // This avoids the 1-second timeout of trying to fetch a raw socket
         return sendRawbtIntent(data);
     }

     try {
         // Try direct HTTP POST for actual network printers
         const controller = new AbortController();
         const timeoutId = setTimeout(() => controller.abort(), 2000);

         await fetch(`http://${printer.ipAddress}:${printer.port}/`, {
             method: 'POST',
             body: data,
             mode: 'no-cors',
             signal: controller.signal
         });
         
         clearTimeout(timeoutId);
         return true;
     } catch (e) {
         console.warn("Direct print failed", e);
         return false;
     }
  }
  
  return true;
};
