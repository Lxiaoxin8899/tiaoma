import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Combobox } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface Option {
    id: string
    label: string
    subtitle?: string
}

interface SearchableSelectProps {
    value: string
    onChange: (value: string) => void
    options: Option[]
    placeholder?: string
    disabled?: boolean
    error?: string
    label: string
    required?: boolean
    allowClear?: boolean
    // 服务端搜索支持
    onSearch?: (query: string) => Promise<void>
    loading?: boolean
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
    value,
    onChange,
    options,
    placeholder = '请选择...',
    disabled = false,
    error,
    label,
    required = false,
    allowClear = false,
    onSearch,
    loading = false
}) => {
    const [query, setQuery] = useState('')

    const selectedOption = options.find(option => option.id === value)

    // 防抖搜索
    useEffect(() => {
        if (!onSearch) return

        const timer = setTimeout(() => {
            if (query.length >= 1) {
                onSearch(query)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [query, onSearch])

    // 本地过滤（当没有 onSearch 时使用）
    const filteredOptions = useMemo(() => {
        if (onSearch) {
            // 服务端搜索模式：直接返回 options（已经是搜索结果）
            return options
        }
        // 本地过滤模式
        if (query === '') {
            return options
        }
        return options.filter((option) => {
            const searchText = `${option.label} ${option.subtitle || ''}`.toLowerCase()
            return searchText.includes(query.toLowerCase())
        })
    }, [options, query, onSearch])

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <Combobox
                value={value}
                // 选择后清空 query，避免下次打开下拉时仍然被上次搜索词过滤
                onChange={(nextValue) => {
                    onChange(nextValue)
                    setQuery('')
                }}
                disabled={disabled}
            >
                <div className="relative">
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                        <Combobox.Input
                            className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${error ? 'border-red-500' : 'border-gray-300'
                                } ${disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-white dark:bg-gray-900'} text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 dark:border-gray-700`}
                            displayValue={() => selectedOption ? `${selectedOption.label}${selectedOption.subtitle ? ` - ${selectedOption.subtitle}` : ''}` : ''}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={onSearch ? `${placeholder}（输入关键词搜索）` : placeholder}
                        />
                        {/* 加载指示器 */}
                        {loading && (
                            <div className="absolute right-16 top-1/2 transform -translate-y-1/2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            </div>
                        )}
                        {/* 可选字段时允许清空选择，解决"只能选不能搜/不好改选"的体验问题 */}
                        {allowClear && !disabled && value && (
                            <button
                                type="button"
                                onClick={() => {
                                    onChange('')
                                    setQuery('')
                                }}
                                className="absolute right-8 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                aria-label="清空选择"
                                title="清空选择"
                            >
                                <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                            </button>
                        )}
                        <Combobox.Button className="absolute right-0 inset-y-0 flex items-center pr-2">
                            <ChevronUpDownIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                        </Combobox.Button>
                    </div>

                    <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-900 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-gray-700 focus:outline-none">
                        {loading ? (
                            <div className="relative cursor-default select-none py-2 px-4 text-gray-500 dark:text-gray-400 text-center">
                                搜索中...
                            </div>
                        ) : filteredOptions.length === 0 ? (
                            <div className="relative cursor-default select-none py-2 px-4 text-gray-700 dark:text-gray-200">
                                {onSearch && query.length < 1 ? '请输入关键词搜索' : '未找到匹配项'}
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <Combobox.Option
                                    key={option.id}
                                    value={option.id}
                                    className={({ active }) =>
                                        `relative cursor-pointer select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-600 text-white' : 'text-gray-900 dark:text-gray-100'
                                        }`
                                    }
                                >
                                    {({ selected, active }) => (
                                        <>
                                            <div className="flex flex-col">
                                                <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                                    {option.label}
                                                </span>
                                                {option.subtitle && (
                                                    <span className={`block text-sm truncate ${active ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                                        {option.subtitle}
                                                    </span>
                                                )}
                                            </div>
                                            {selected && (
                                                <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-blue-600'
                                                    }`}>
                                                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                                </span>
                                            )}
                                        </>
                                    )}
                                </Combobox.Option>
                            ))
                        )}
                    </Combobox.Options>
                </div>
            </Combobox>
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    )
}

export default SearchableSelect
