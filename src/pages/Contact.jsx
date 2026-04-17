import React from 'react';
import Navbar from '../components/Navbar';
import { Mail, MapPin, Phone } from 'lucide-react';

const Contact = () => {
    return (
        <div className="min-h-screen bg-background flex flex-col font-sans">
            <Navbar />

            <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-20">

                {/* Editorial Header */}
                <div className="mb-20 text-center relative">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted block mb-4">Say hello</span>
                    <h1 className="text-5xl font-serif font-bold text-primary mb-4">Meet the Team</h1>
                    <p className="text-muted text-sm max-w-md mx-auto">We're the people behind NewPlanner. Feel free to reach out!</p>
                    <div className="w-16 h-px bg-primary/20 mx-auto mt-6"></div>
                </div>

                <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-start">

                    {/* Left Col: Primary Contact Info (To be filled by user) */}
                    <div className="w-full lg:w-1/2">
                        <h2 className="text-2xl font-serif font-bold text-primary mb-6">Get in Touch</h2>

                        <div className="p-8 bg-white border border-primary/5 rounded-xl shadow-sm relative group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-amber-400 rounded-l-xl scale-y-0 group-hover:scale-y-100 transition-transform duration-500 origin-top"></div>

                            <h3 className="text-xl font-serif font-bold text-primary mb-1">PRAKASH K</h3>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-6">Project Lead</p>

                            <div className="space-y-6">
                                <div className="flex items-center gap-4 text-primary/80 font-light">
                                    <Mail className="w-5 h-5 text-secondary" strokeWidth={1.5} />
                                    <a href="mailto:rajaselvan2003@gmail.com" className="hover:text-primary transition-colors">kprakash131003@gmail.com</a>
                                </div>
                                <div className="flex items-center gap-4 text-primary/80 font-light">
                                    <Phone className="w-5 h-5 text-secondary" strokeWidth={1.5} />
                                    <a href="tel:+919994618792" className="hover:text-primary transition-colors">+91 93854 93906</a>
                                </div>
                                <div className="flex items-center gap-4 text-primary/80 font-light">
                                    <MapPin className="w-5 h-5 text-secondary" strokeWidth={1.5} />
                                    <span>Tenkasi, Tamilnadu</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Col: The Four Names (To be filled by user) */}
                    <div className="w-full lg:w-1/2">
                        <h2 className="text-2xl font-serif font-bold text-primary mb-4">Our Team</h2>
                        <p className="text-muted text-sm mb-8 leading-relaxed">
                            The people who built NewPlanner.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {['PRAKASH K', 'RAMACHANDRAN', 'THANIYEL RAJA A', 'VIJAYAN V'].map((name, index) => (
                                <div key={index} className="bg-white border border-primary/8 rounded-xl p-5 hover:shadow-md transition-shadow">
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-500 block mb-1">Member {String(index + 1).padStart(2,'0')}</span>
                                    <h4 className="text-lg font-serif font-bold text-primary">{name}</h4>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default Contact;
