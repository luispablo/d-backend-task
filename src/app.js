const express = require('express');
const bodyParser = require('body-parser');
const { getProfile } = require('./middleware/getProfile')
const { Op } = require('sequelize');
const app = express();

const buildApp = function buildApp (dbName) {
    
    const { sequelize } = require('./model')(dbName);

    app.use(bodyParser.json());
    app.set('sequelize', sequelize)
    app.set('models', sequelize.models)
    
    const activeContractCondition = id => ({
        [Op.or]: [
            { ClientId: id },
            { ContractorId: id }
        ], 
        status: { [Op.notIn]: ["terminated"] }
    });
    
    app.get('/profiles', getProfile, async function getProfile (req, res) {
        try {
            const { Profile } = req.app.get('models');
            const profile = await Profile.findOne({
                where: { id: req.profile.id }
            });
            res.json(profile);
        } catch (err) {
            console.error(err); // FIXME: Log missing!
            res.status(500).json(err);
        }
    });
    
    app.get('/contracts/:id',getProfile ,async (req, res) =>{
        const {Contract} = req.app.get('models')
        const {id} = req.params
        const contract = await Contract.findOne({where: {id}})
        if(!contract || (req.profile.id !== contract.ClientId && req.profile.id !== contract.ContractorId)) return res.status(404).end()
        res.json(contract)
    })
    
    app.get('/contracts', getProfile, async function getContracts (req, res) {
        try {
            const { Contract } = req.app.get('models');
            const contracts = await Contract.findAll({
                where: activeContractCondition(req.profile.id)
            });
            res.json(contracts);
        } catch (err) {
            console.error(err); // FIXME: Log missing!
            res.status(500).json(err);
        }
    });
    
    app.get('/jobs/unpaid', getProfile, async function getUnpaidJobs (req, res) {
        try {
            const { Contract, Job } = req.app.get('models');
            const unpaidJobs = await Job.findAll({
                where: {
                    paymentDate: null
                },
                include: [{
                    model: Contract,
                    where: activeContractCondition(req.profile.id)
                }]
            });
            res.json(unpaidJobs);
        } catch (err) {
            console.error(err); // FIXME: Log missing!
            res.status(500).json(err);
        }
    });
    
    app.post('/jobs/:id/pay', getProfile, async function payJob (req, res) {
        try {
            const { Contract, Job, Profile } = req.app.get('models');
            const unpaidJob = await Job.findOne({
                where: {
                    id: req.params.id,
                    paymentDate: null
                },
                include: [{
                    model: Contract,
                    where: activeContractCondition(req.profile.id)
                }]
            });
    
            if (unpaidJob) {
                const clientProfile = await Profile.findOne({ where: { id: req.profile.id }});
                if (clientProfile.balance >= unpaidJob.price) {
                    const contractorProfile = await Profile.findOne({ where: { id: unpaidJob.Contract.ContractorId }});
                    const result = await sequelize.transaction(async transaction => {
                        await clientProfile.update({
                            balance: clientProfile.balance - unpaidJob.price
                        }, { transaction })
                        await contractorProfile.update({
                          balance: contractorProfile.balance + unpaidJob.price
                        }, { transaction });
                    });
                    res.json(result);
                } else {
                    res.status(400).send("insufficient founds");
                }
            } else {
                res.status(404).end();
            }
        } catch (err) {
            console.error(err); // FIXME: Log missing!
            res.status(500).json(err);
        }
    });

    // TODO: Only calling profile can deposit in its own account?
    app.post('/balances/deposit/:userId', getProfile, async function deposit (req, res) {
        try {
            const { Contract, Job, Profile } = req.app.get('models');
            const unpaidJobs = await Job.findAll({
                where: {
                    paymentDate: null
                },
                include: [{
                    model: Contract,
                    where: activeContractCondition(req.params.userId)
                }]
            });

            const unpaidJobsTotal = unpaidJobs.reduce((prev, curr) => prev + curr.price, 0);

            if (unpaidJobsTotal === 0 || unpaidJobsTotal * 0.25 >= req.body.amount) {
                const profile = await Profile.findOne({ where: { id: req.params.userId } });
                await profile.update({ balance: profile.balance + req.body.amount });
                res.status(200).end();
            } else {
                res.status(400).end();
            }
        } catch (err) {
            console.error(err); // FIXME: Log missing!
            res.status(500).json(err);
        }
    });

    // TODO: Only active contracts?
    app.get('/admin/best-profession', getProfile, async function getBestProfession (req, res) {
        try {
            const startDate = new Date(req.query.start);
            const endDate = new Date(req.query.end);
            const { Contract, Job, Profile } = req.app.get('models');
            const [bestProfession] = await Job.findAll({
                attributes: [
                    'Contract.Contractor.profession',
                    [sequelize.fn('SUM', sequelize.col('price')), 'total_price']
                ],
                where: {
                    paymentDate: { [Op.between]: [startDate, endDate] }
                },
                include: [
                    { model: Contract, include: [{ model: Profile, as: "Contractor" }] }
                ],
                group: 'profession',
                order: [
                    ['total_price', 'DESC']
                ]
            });
            res.json(bestProfession.dataValues.Contract.Contractor.profession);
        } catch (err) {
            console.error(err); // FIXME: Log missing!
            res.status(500).json(err);
        }
    });

    app.get('/admin/best-clients', getProfile, async function getBestClients (req, res) {
        try {
            const startDate = new Date(req.query.start);
            const endDate = new Date(req.query.end);
            const limit = req.query.limit || 2;
            const { Contract, Job, Profile } = req.app.get('models');
            const bestClients = await Job.findAll({
                attributes: [
                    'Contract.ClientId',
                    [sequelize.fn('SUM', sequelize.col('price')), 'paid']
                ],
                where: {
                    paymentDate: { [Op.between]: [startDate, endDate] }
                },
                include: [
                    { model: Contract, include: [{ model: Profile, as: 'Client' }] }
                ],
                group: ['Contract.ClientId'],
                order: [
                    ['paid', 'DESC']
                ],
                limit
            });
            res.json(bestClients.map(j => ({
                id: j.Contract.ClientId,
                fullName: `${j.Contract.Client.firstName} ${j.Contract.Client.lastName}`,
                paid: j.paid
            })));
        } catch (err) {
            console.error(err); // FIXME: Log missing!
            res.status(500).json(err);
        }
    });

    return app;
};

module.exports = buildApp;
