import React, { useRef, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { LabelPrintData } from '../../types/database';
import type { LabelConfig } from '../../pages/LabelPrint';

interface LabelPrintTemplateProps {
  data: LabelPrintData;
  config?: LabelConfig;
}

// 默认配置
const DEFAULT_CONFIG: LabelConfig = {
  labelWidth: 100,
  labelHeight: 100,
  marginTop: 2,
  marginBottom: 2,
  marginLeft: 2,
  marginRight: 2,
  offsetX: 0,
  offsetY: 0,
  tableWidth: 80,  // 降低表格宽度，让内容不超出
  labelColumnWidth: 25,
  titleFontSize: 12,
  labelFontSize: 10,
  valueFontSize: 12,
  companyName: '深圳市颖灿生物科技有限公司',
  showBarcode: false,  // 默认关闭一维条形码
  showQrcode: true,
  previewScale: 1.2
};

const LabelPrintTemplate: React.FC<LabelPrintTemplateProps> = ({ data, config }) => {
  const barcodeRef = useRef<HTMLCanvasElement>(null);
  const materialQrcodeRef = useRef<HTMLCanvasElement>(null);
  const batchQrcodeRef = useRef<HTMLCanvasElement>(null);

  // 合并配置
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const scale = cfg.previewScale;

  // 生成一维条形码（材料编码）- 保留但默认关闭
  useEffect(() => {
    if (barcodeRef.current && data.material_barcode && cfg.showBarcode) {
      try {
        JsBarcode(barcodeRef.current, data.material_barcode, {
          format: 'CODE128',
          width: 1.5,
          height: 30,
          displayValue: true,
          fontSize: 9,
          margin: 1,
          background: '#ffffff',
          lineColor: '#000000'
        });
      } catch (error) {
        console.error('Barcode generation error:', error);
      }
    }
  }, [data.material_barcode, cfg.showBarcode]);

  // 生成物料二维码（材料编码）
  useEffect(() => {
    // 确保有有效的条码数据再生成
    const barcodeData = data.material_barcode;
    if (materialQrcodeRef.current && barcodeData && typeof barcodeData === 'string' && barcodeData.trim() && cfg.showQrcode) {
      QRCode.toCanvas(materialQrcodeRef.current, barcodeData, {
        width: 55,
        margin: 0,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }, (error) => {
        if (error) console.error('Material QR Code generation error:', error);
      });
    }
  }, [data.material_barcode, cfg.showQrcode]);

  // 生成批次二维码（批次号）
  useEffect(() => {
    // 确保有有效的条码数据再生成
    const barcodeData = data.batch_barcode;
    if (batchQrcodeRef.current && barcodeData && typeof barcodeData === 'string' && barcodeData.trim() && cfg.showQrcode) {
      QRCode.toCanvas(batchQrcodeRef.current, barcodeData, {
        width: 55,
        margin: 0,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }, (error) => {
        if (error) console.error('Batch QR Code generation error:', error);
      });
    }
  }, [data.batch_barcode, cfg.showQrcode]);

  // 格式化生产日期显示
  const formatProductionDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}/${month}/${day}`;
  };

  // 单元格样式 - 适当增加行高以利用底部空间
  const cellStyle = { padding: '4px 4px', lineHeight: '1.3' };
  const labelCellStyle = { ...cellStyle, width: `${cfg.labelColumnWidth}%` };

  return (
    <div
      className="label-template bg-white border border-black"
      style={{
        width: `${cfg.labelWidth * 3.78 * scale}px`,
        fontSize: `${cfg.labelFontSize * scale}px`,
        fontFamily: 'SimHei, "Microsoft YaHei", sans-serif'
      }}
    >
      {/* 公司名称标题 */}
      <div
        className="text-center font-bold border-b border-black"
        style={{ fontSize: `${cfg.titleFontSize * scale}px`, padding: '2px 0' }}
      >
        {data.company_name}
      </div>

      {/* 信息表格 */}
      <table
        className="border-collapse"
        style={{
          width: `${cfg.tableWidth}%`,
          fontSize: `${cfg.labelFontSize * scale}px`
        }}
      >
        <tbody>
          <tr className="border-b border-black">
            <td className="border-r border-black font-bold" style={labelCellStyle}>供应商</td>
            <td className="text-red-600 font-bold" style={{ ...cellStyle, fontSize: `${cfg.valueFontSize * scale}px` }}>
              {data.supplier_code}
            </td>
          </tr>

          <tr className="border-b border-black">
            <td className="border-r border-black font-bold" style={cellStyle}>品名</td>
            <td className="text-red-600 font-bold" style={{ ...cellStyle, fontSize: `${(cfg.valueFontSize + 1) * scale}px` }}>
              {data.product_name}
            </td>
          </tr>

          <tr className="border-b border-black">
            <td className="border-r border-black font-bold" style={cellStyle}>编码</td>
            <td className="text-red-600 font-bold" style={{ ...cellStyle, fontSize: `${(cfg.valueFontSize + 2) * scale}px` }}>
              {data.product_code}
            </td>
          </tr>

          <tr className="border-b border-black">
            <td className="border-r border-black font-bold" style={cellStyle}>重量</td>
            <td className="text-red-600 font-bold" style={{ ...cellStyle, fontSize: `${cfg.valueFontSize * scale}px` }}>
              {data.weight || '-'}
            </td>
          </tr>

          <tr className="border-b border-black">
            <td className="border-r border-black font-bold" style={cellStyle}>开封日期</td>
            <td style={cellStyle}>{data.open_date || ''}</td>
          </tr>

          <tr className="border-b border-black">
            <td className="border-r border-black font-bold" style={cellStyle}>生产日期</td>
            <td className="text-red-600 font-bold" style={{ ...cellStyle, fontSize: `${cfg.valueFontSize * scale}px` }}>
              {formatProductionDate(data.production_date)}
            </td>
          </tr>

          <tr className="border-b border-black">
            <td className="border-r border-black font-bold" style={cellStyle}>储存条件</td>
            <td style={{ ...cellStyle, fontSize: `${(cfg.labelFontSize - 1) * scale}px` }}>
              {data.storage_conditions || '-'}
            </td>
          </tr>

          <tr className="border-b border-black">
            <td className="border-r border-black font-bold" style={cellStyle}>批号</td>
            <td className="text-red-600 font-bold" style={{ ...cellStyle, fontSize: `${(cfg.valueFontSize + 1) * scale}px` }}>
              {data.batch_number}
            </td>
          </tr>

          <tr className="border-b border-black">
            <td className="border-r border-black font-bold" style={cellStyle}>保质期</td>
            <td className="text-red-600 font-bold" style={{ ...cellStyle, fontSize: `${cfg.valueFontSize * scale}px` }}>
              {data.shelf_life || '-'}
            </td>
          </tr>

          <tr>
            <td className="border-r border-black font-bold" style={cellStyle}>成份</td>
            <td style={{ ...cellStyle, fontSize: `${(cfg.labelFontSize - 1) * scale}px` }}>
              {data.main_ingredients || '-'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 条形码区域 - 独立于表格，可选，默认关闭 */}
      {cfg.showBarcode && (
        <div className="border-t border-black" style={{ padding: '3px', textAlign: 'center' }}>
          <canvas ref={barcodeRef} style={{ maxWidth: '100%', height: 'auto' }} />
        </div>
      )}

      {/* 二维码区域 - 宽度与表格一致，使用 space-around 均匀分布 */}
      {cfg.showQrcode && (
        <div
          className="border-t border-black"
          style={{
            width: `${cfg.tableWidth}%`,  // 关键：与表格宽度保持一致
            display: 'flex',
            justifyContent: 'space-around',  // 均匀分布，自动计算间距
            alignItems: 'center',
            padding: '6px 0'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <canvas ref={materialQrcodeRef} style={{ width: '55px', height: '55px' }} />
            <span style={{ fontSize: `${8 * scale}px`, marginTop: '2px', fontWeight: 'bold' }}>物料码</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <canvas ref={batchQrcodeRef} style={{ width: '55px', height: '55px' }} />
            <span style={{ fontSize: `${8 * scale}px`, marginTop: '2px', fontWeight: 'bold' }}>批次码</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabelPrintTemplate;
