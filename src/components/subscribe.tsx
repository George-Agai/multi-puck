import React from 'react'

export const SubscribeSection: React.FC = () => (
    <section className="px-2 py-6 bg-white">
        <div className="mx-auto flex flex-col md:flex-row items-center md:items-center justify-between gap-2">
            <p className="border border-orange-200 inline-block text-sm px-0.5 rounded-full bg-orange-100">Subscribe👍</p>
            <div className="flex-1">
                <p className="text-lg font-medium text-center max-w-md">
                    Don’t miss out on the latest insights, update news, and tips!💡
                </p>
            </div>

            <form className="flex flex-col sm:flex-row items-center sm:items-center gap-2">
                <input
                    type="email"
                    placeholder="your@email.com"
                    className="px-3 py-1 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-300 focus:outline-none"
                    required
                />
                <button
                    type="submit"
                    className="px-3 py-1 rounded-2xl bg-blue-500 cursor-pointer text-white font-semibold hover:bg-blue-600 transition"
                >
                    Subscribe
                </button>

            </form>
        </div>
    </section>
)
