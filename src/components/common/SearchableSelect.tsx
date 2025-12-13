import React, { useState, useMemo } from 'react'
import { Combobox } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

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
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
    value,
    onChange,
    options,
    placeholder = '请选择...',
    disabled = false,
    error,
    label,
    required = false
}) => {
    const [query, setQuery] = useState('')

    const selectedOption = options.find(option => option.id === value)

    const filteredOptions = useMemo(() => {
        if (query === '') {
            return options
        }
        return options.filter((option) => {
            const searchText = `${option.label} ${option.subtitle || ''}`.toLowerCase()
            return searchText.includes(query.toLowerCase())
        })
    }, [options, query])

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <Combobox value={value} onChange={onChange} disabled={disabled}>
                <div className="relative">
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                        <Combobox.Input
                            className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${error ? 'border-red-500' : 'border-gray-300'
                                } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                            displayValue={() => selectedOption ? `${selectedOption.label}${selectedOption.subtitle ? ` - ${selectedOption.subtitle}` : ''}` : ''}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={placeholder}
                        />
                        <Combobox.Button className="absolute right-0 inset-y-0 flex items-center pr-2">
                            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </Combobox.Button>
                    </div>

                    <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        {filteredOptions.length === 0 && query !== '' ? (
                            <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                                未找到匹配项
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <Combobox.Option
                                    key={option.id}
                                    value={option.id}
                                    className={({ active }) =>
                                        `relative cursor-pointer select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-600 text-white' : 'text-gray-900'
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
                                                    <span className={`block text-sm truncate ${active ? 'text-blue-200' : 'text-gray-500'}`}>
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
