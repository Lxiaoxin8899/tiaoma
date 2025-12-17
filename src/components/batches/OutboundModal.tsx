import React, { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { MaterialBatch } from '@/types/database'

interface OutboundModalProps {
    batch: MaterialBatch
    onClose: () => void
    onConfirm: (quantity: number, reason: string) => Promise<void>
}

const OutboundModal: React.FC<OutboundModalProps> = ({ batch, onClose, onConfirm }) => {
    const [quantity, setQuantity] = useState<number>(0)
    const [reason, setReason] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    // 说明：数据库里批次“当前库存”字段为 remaining_quantity；为兼容旧数据，这里做一次兜底。
    const currentRemaining = batch.remaining_quantity ?? batch.quantity

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (quantity <= 0) {
            setError('出库数量必须大于0')
            return
        }
        if (quantity > currentRemaining) {
            setError('出库数量不能大于当前库存')
            return
        }

        setSubmitting(true)
        try {
            await onConfirm(quantity, reason)
            onClose()
        } catch (err) {
            console.error(err)
            setError('出库失败，请重试')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={true} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-md w-full">
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <Dialog.Title className="text-lg font-semibold text-gray-900">
                            物料出库
                        </Dialog.Title>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div className="bg-blue-50 p-3 rounded-md mb-4">
                            <p className="text-sm text-blue-900 font-medium">当前操作批次</p>
                            <div className="text-sm text-blue-700 mt-1">
                                <p>批次号：{batch.batch_number}</p>
                                <p>物料：{batch.material?.name} ({batch.material?.code})</p>
                                <p>当前库存：<span className="font-bold">{currentRemaining}</span> {batch.material?.unit_obj?.name}</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                出库数量 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                max={currentRemaining}
                                value={quantity}
                                onChange={(e) => {
                                    setQuantity(parseFloat(e.target.value))
                                    setError('')
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                autoFocus
                            />
                            {error && (
                                <p className="mt-1 text-sm text-red-600 flex items-center">
                                    <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                                    {error}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                出库原因/备注
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={2}
                                placeholder="例如：领料使用、损耗..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                取消
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || quantity <= 0 || quantity > currentRemaining}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {submitting ? '处理中...' : '确认出库'}
                            </button>
                        </div>
                    </form>
                </Dialog.Panel>
            </div>
        </Dialog>
    )
}

export default OutboundModal
